// api/middlewares/cors.js
import cors from 'cors';

export default cors({
  origin: [
    'https://soundshineradio.com',
    'https://www.soundshineradio.com',
    'https://discord.com',
    'https://api.soundshineradio.com'
  ],
  credentials: true
});
