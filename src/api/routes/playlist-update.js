import express from 'express';
import botConfig from '#bot/config.js';
import { z } from 'zod';
import logger from '#shared/logging/logger.js';

const { API_TOKEN, PLAYLIST_CHANNEL_ID } = botConfig;

const playlistSchema = z.object({
  playlist: z.string().min(1, 'Playlist is required'),
  topic: z.string().min(1, 'Topic is required')
});


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

export default (client) => {
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
      const { playlist, topic } = parseResult.data;

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

      logger.info('=== DÉBUT DU TRAITEMENT ===');

      // 1. Envoi de l'embed de playlist
      logger.info('🔄 Étape 1: Récupération du canal playlist...');
      const playlistChannel = client.channels.cache.get(PLAYLIST_CHANNEL_ID);

      if (!playlistChannel?.isTextBased()) {
        logger.error('❌ Canal playlist introuvable ou invalide');
        return res
          .status(500)
          .json({ error: 'Canal Discord invalide pour la playlist.' });
      }

      logger.info(`Canal playlist trouvé: ${playlistChannel.name}`);

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
      try {
        await playlistChannel.send({ embeds: [embed] });
        logger.info('Embed playlist envoyé avec succès');
        playlistSent = true;
      } catch (embedErr) {
        logger.error(
          `❌ Erreur lors de l'envoi de l'embed: ${embedErr.message}`
        );
        logger.error(`Code d'erreur embed: ${embedErr.code}`);
        // Continue quand même pour tester le stage channel
      }
      logger.info('=== TRAITEMENT TERMINÉ AVEC SUCCÈS ===');
      return res.status(200).json({
        status: 'OK',
        message: 'Playlist mise à jour avec succès.',
        playlist: normalizedPlaylist,
        topic: normalizedTopic,
        details: {
          playlistSent
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

