import express from 'express';
import cors from 'cors';
import path from 'path';

import hitsRoutes from './routes/hits.routes';
import sujetosRoutes from './routes/sujetos.routes';
import viewsRoutes from './routes/views.routes';

const expressLayouts = require('express-ejs-layouts');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'shared/layout');

app.use(expressLayouts);

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/', viewsRoutes);
app.use('/api/hits', hitsRoutes);
app.use('/api/sujetos', sujetosRoutes);

export default app;