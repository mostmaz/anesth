import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import routes from './routes';

const app = express();
const port = process.env.PORT || 3000;

import path from 'path';

// ...
app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', routes);

app.get('/', (req, res) => {
    res.json({ message: 'ICU Management System API Running' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
