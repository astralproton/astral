import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Supabase
const SUPABASE_URL = 'https://szojjdcfphaawixewnkm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOi...'; // tu clave aquí
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Nuevo usuario (contador usando Supabase opcionalmente podrías migrarlo después)
let contador = 1;
app.get('/nuevo-usuario', (req, res) => {
  const nuevoID = `astraluser${contador++}`;
  res.json({ id: nuevoID });
});

// Registrar usuario
app.post('/registrar-usuario', async (req, res) => {
  const { id, nombre } = req.body;
  if (!id || !nombre) return res.status(400).json({ error: 'Faltan datos' });

  const { error } = await supabase.from('usuarios').insert([
    { id, nombre, fecha: new Date().toISOString(), baneado: false }
  ]);
  if (error) return res.status(500).json({ error: 'Error al guardar' });
  res.json({ success: true });
});

// Leer usuarios
app.get('/usuarios', async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('*').order('fecha', { ascending: false });
  if (error) return res.status(500).json({ error: 'Error al leer usuarios' });
  res.json(data);
});

// Banear usuario
app.post('/ban', async (req, res) => {
  const { id } = req.body;
  const { error } = await supabase.from('usuarios').update({ baneado: true }).eq('id', id);
  res.json({ success: !error });
});

// Desbanear usuario
app.post('/unban', async (req, res) => {
  const { id } = req.body;
  const { error } = await supabase.from('usuarios').update({ baneado: false }).eq('id', id);
  res.json({ success: !error });
});

// Verificar si está baneado
app.post('/check-banned', async (req, res) => {
  const { id } = req.body;
  const { data, error } = await supabase.from('usuarios').select('baneado').eq('id', id).single();
  if (error || !data) return res.json({ banned: false });
  res.json({ banned: data.baneado === true });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
