import express from 'express';
import botConfig from '#bot/config.js';
import { z } from 'zod';
import logger from '#shared/logging/logger.js';
import { publishPlaylistUpdate } from '#api/services/socialPublishService.js';

const { API_TOKEN, PLAYLIST_CHANNEL_ID } = botConfig;

// Coerce the incoming `social` value (boolean, string, missing, ...) into a
// real boolean. Anything falsy/unrecognized/omitted defaults to false.
const socialFlagSchema = z.preprocess((val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.trim().toLowerCase() === 'true';
  return false;
}, z.boolean());

const playlistSchema = z.object({
  playlist: z.string().min(1, 'Playlist is required'),
  topic: z.string().min(1, 'Topic is required'),
  social: socialFlagSchema.default(false)
});

/**
 * Fires the social orchestration entry point without letting failures
 * affect the Discord update flow or the API response. The entry point
 * itself already catches Buffer/media-resolution failures and returns a
 * normalized result, so this is a defense-in-depth backstop.
 */
const triggerSocialPublish = async ({ playlist, topic }, gateway) => {
  try {
    await publishPlaylistUpdate({ playlist, topic, gateway });
  } catch (socialErr) {
    logger.error(
      `⚠️ [social] Social orchestration failed (ignored, Discord update unaffected): ${socialErr.message}`
    );
  }
};

// Fonction pour essayer de récupérer les caractères corrompus
const tryFixEncoding = async (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Si le texte contient des caractères de remplacement, essayer de le récupérer
  if (text.includes('')) {
    logger.info('🔧 Tentative de récupération d\'encodage pour:', text);

    // Essayer différents encodages
    const encodings = ['latin1', 'iso-8859-1', 'cp1252', 'utf8'];

    for (const encoding of encodings) {
      try {
        // Convertir en buffer puis en string avec l'encodage
        const buffer = Buffer.from(text, 'binary');
        const decoded = buffer.toString(encoding);

        if (!decoded.includes('')) {
          await logger.success(
            `Récupération réussie avec ${encoding}:`,
            decoded
          );
          return decoded;
        }
      } catch {
        logger.error(`❌ Échec avec ${encoding}`);
      }
    }
  }

  return text;
};

// Fonction pour décoder les séquences d'échappement Unicode
const decodeUnicodeEscapes = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Décoder les séquences \uXXXX
  let decoded = text.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Décoder les caractères spéciaux courants encodés par PowerShell
  const specialChars = {
    '\\u0027': '\'', // Apostrophe
    '\\u0022': '"', // Guillemet double
    '\\u003c': '<', // Chevron gauche
    '\\u003e': '>', // Chevron droit
    '\\u0026': '&', // Et commercial
    '\\u003d': '=', // Égal
    '\\u002b': '+', // Plus
    '\\u002d': '-', // Moins
    '\\u0028': '(', // Parenthèse ouvrante
    '\\u0029': ')', // Parenthèse fermante
    '\\u005b': '[', // Crochet ouvrant
    '\\u005d': ']', // Crochet fermant
    '\\u007b': '{', // Accolade ouvrante
    '\\u007d': '}', // Accolade fermante
    '\\u005c': '\\', // Backslash
    '\\u002f': '/', // Slash
    '\\u003a': ':', // Deux points
    '\\u003b': ';', // Point-virgule
    '\\u002c': ',', // Virgule
    '\\u002e': '.', // Point
    '\\u0021': '!', // Point d'exclamation
    '\\u003f': '?' // Point d'interrogation
  };

  // Remplacer les séquences spéciales
  for (const [encoded, replacement] of Object.entries(specialChars)) {
    decoded = decoded.replace(
      new RegExp(encoded.replace(/\\/g, '\\\\'), 'g'),
      replacement
    );
  }

  return decoded;
};

// Fonction pour s'assurer que les accents sont correctement encodés
const ensureAccentEncoding = async (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // D'abord décoder les séquences d'échappement Unicode
  let cleanedText = decodeUnicodeEscapes(text);

  // Ensuite essayer de récupérer les caractères corrompus
  cleanedText = await tryFixEncoding(cleanedText);

  // Détecter et corriger les caractères corrompus ()
  // Remplacer les caractères de remplacement Unicode (U+FFFD) par des espaces
  cleanedText = cleanedText.replace(/\uFFFD/g, ' ');

  // Essayer de récupérer les caractères UTF-8 mal encodés
  try {
    // Si le texte contient des séquences d'échappement Unicode, les décoder
    if (cleanedText.includes('\\u')) {
      cleanedText = JSON.parse(`"${cleanedText}"`);
    }
  } catch {
    // Si ça échoue, on garde le texte tel quel
  }

  // S'assurer que le texte est correctement encodé en UTF-8
  return cleanedText
    .normalize('NFC') // Normalisation Unicode pour s'assurer que les accents sont bien formés
    .trim(); // Supprimer les espaces en début/fin
};

// Fonction de débogage pour vérifier l'encodage
const debugEncoding = async (text, label) => {
  if (!text) return;

  await logger.debug(`=== DEBUG ENCODING: ${label} ===`);
  await logger.debug(`Original: "${text}"`);
  await logger.debug(`Length: ${text.length}`);
  await logger.debug(
    `Char codes: ${Array.from(text)
      .map((c) => c.charCodeAt(0))
      .join(', ')}`
  );
  await logger.debug(
    `UTF-8 bytes: ${Buffer.from(text, 'utf8').toString('hex')}`
  );
  await logger.debug(`Normalized: "${await ensureAccentEncoding(text)}"`);
  await logger.debug('================================');
};

export default (gateway) => {
  const router = express.Router();

  // Configuration pour s'assurer que les données JSON sont correctement décodées
  router.use(
    express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        // S'assurer que le buffer est traité comme UTF-8
        req.rawBody = buf;
      }
    })
  );

  router.post('/', async (req, res) => {
    try {
      logger.info('POST /v1/playlist-update');

      // Debug du raw body pour diagnostiquer l'encodage
      if (req.rawBody) {
        logger.info('🔍 DEBUG RAW BODY:');
        logger.info(`Raw body hex: ${req.rawBody.toString('hex')}`);
        logger.info(`Raw body utf8: ${req.rawBody.toString('utf8')}`);
        logger.info(`Raw body length: ${req.rawBody.length}`);
      }

      // Vérification du token dans le header
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== API_TOKEN) {
        return res.status(403).json({ error: 'Invalid or missing API token.' });
      }

      // Validation du body avec zod
      const parseResult = playlistSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.errors
        });
      }
      const { playlist, topic, social } = parseResult.data;

      // Normalisation des textes pour gérer les accents
      const normalizedPlaylist = await ensureAccentEncoding(playlist);
      const normalizedTopic = await ensureAccentEncoding(topic);

      // Debug de l'encodage
      await debugEncoding(playlist, 'PLAYLIST ORIGINAL');
      await debugEncoding(normalizedPlaylist, 'PLAYLIST NORMALISÉ');
      await debugEncoding(topic, 'TOPIC ORIGINAL');
      await debugEncoding(normalizedTopic, 'TOPIC NORMALISÉ');

      // Debug spécifique pour les séquences Unicode
      await logger.debug('🔍 DEBUG SÉQUENCES UNICODE:');
      await logger.debug(`Playlist original: "${playlist}"`);
      await logger.debug(
        `Playlist après décodage Unicode: "${decodeUnicodeEscapes(playlist)}"`
      );
      await logger.debug(`Topic original: "${topic}"`);
      await logger.debug(
        `Topic après décodage Unicode: "${decodeUnicodeEscapes(topic)}"`
      );

      logger.info(`Topic original: ${topic}`);
      logger.info(`Topic normalisé: ${normalizedTopic}`);
      logger.info(`Playlist original: ${playlist}`);
      logger.info(`Playlist normalisé: ${normalizedPlaylist}`);

      let playlistSent = false;
      let stageTopic = false;

      logger.info('=== DÉBUT DU TRAITEMENT ===');

      // 1. Envoi de l'embed de playlist
      logger.info('🔄 Étape 1: Envoi de l\'embed via la gateway Discord...');

      const description = `**${normalizedPlaylist}** est maintenant en ondes sur soundSHINE! 
      \nVous pouvez l'écouter en direct sur le https://soundshineradio.com`;

      const embed = {
        title: '💿 Nouvelle playlist en ondes',
        description,
        color: 0xaff6e4,
        footer: {
          text: 'soundSHINE Radio',
          icon_url: 'https://soundshineradio.com/avatar.jpg'
        }
      };

      // Vérification finale de l'encodage avant envoi
      logger.info('🔍 Vérification finale de l\'encodage:');
      logger.info(`Description embed: "${description}"`);
      logger.info(
        `Description bytes: ${Buffer.from(description, 'utf8').toString('hex')}`
      );

      logger.info('🔄 Étape 2: Tentative d\'envoi de l\'embed...');
      const sendResult = await gateway.sendChannelMessage(PLAYLIST_CHANNEL_ID, { embeds: [embed] });

      if (sendResult.delivered) {
        logger.info('Embed playlist envoyé avec succès');
        playlistSent = true;
      } else if (sendResult.reason === 'invalid_channel') {
        logger.error('❌ Canal playlist introuvable ou invalide');
        return res
          .status(500)
          .json({ error: 'Canal Discord invalide pour la playlist.' });
      } else {
        logger.error(
          `❌ Erreur lors de l'envoi de l'embed: ${sendResult.error}`
        );
        // Continue quand même pour tester le stage channel
      }

      const stageResult = await gateway.updateStageTopic(botConfig.VOICE_CHANNEL_ID, normalizedTopic);
      if (stageResult.updated) {
        stageTopic = true;
      } else {
        logger.error(`Erreur lors de la mise à jour du stage: ${stageResult.error}`);
      }

logger.info('=== TRAITEMENT TERMINÉ AVEC SUCCÈS ===');
logger.info(`SOCIAL FLAG VALUE: ${social} (${typeof social})`);
      if (social === true) {
        await triggerSocialPublish({ playlist: normalizedPlaylist, topic: normalizedTopic }, gateway);
      }

      return res.status(200).json({
        status: playlistSent && stageTopic ? 'OK' : 'PARTIAL',
        message: 'Playlist mise à jour avec succès.',
        playlist: normalizedPlaylist,
        topic: normalizedTopic,
        details: {
          playlistSent,
          stageTopic,
        }
      });
    } catch (err) {
      logger.error(`ERREUR FATALE: ${err.message}`);
      logger.error(`Code: ${err.code}`);
      logger.error(`Stack: ${err.stack}`);
      return res
        .status(500)
        .json({ error: 'Erreur serveur lors du traitement.' });
    }
  });

  return router;
};
