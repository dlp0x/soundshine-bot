import { Router } from 'express';
import { botOnly } from '../middleware/auth.js';
import { addRequestLimiter } from '../middleware/rateLimit.js';

import { nowPlaying, history, topTracks }   from '../controllers/songs.controller.js';
import { getRequests, search, list, add }   from '../controllers/requests.controller.js';
import { shows, showDetails }               from '../controllers/shows.controller.js';
import { events, schedule }                 from '../controllers/events.controller.js';
import { posts, postDetails }               from '../controllers/blog.controller.js';
import { team, memberDetails }              from '../controllers/team.controller.js';

const router = Router();

// --- Songs ---
router.get('/now-playing',  nowPlaying);
router.get('/history',      history);
router.get('/top-tracks',   topTracks);

// --- Requests ---
router.get('/requests',          getRequests);          // site web
router.get('/requests/search',   botOnly, search);      // bot seulement
router.get('/requests/list',     botOnly, list);        // bot seulement
router.post('/requests/add',     botOnly, addRequestLimiter, add); // bot seulement

// --- Shows ---
router.get('/shows',      shows);
router.get('/shows/:id',  showDetails);

// --- Events ---
router.get('/events',          events);
router.get('/events/schedule', schedule);

// --- Blog ---
router.get('/blog',         posts);
router.get('/blog/:slug',   postDetails);

// --- Team ---
router.get('/team',       team);
router.get('/team/:id',   memberDetails);

export default router;
