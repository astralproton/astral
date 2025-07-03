const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const FILE = './baneados.json';

// Leer lista
function leerLista() {
  try {
    return JSON.parse(fs.readFileSync(FILE));
  } catch {
    return [];
  }
}

// Guardar lista
function guardarLista(lista) {
  fs.writeFileSync(FILE, JSON.stringify(lista, null, 2));
}

// GET /banned
app.get('/banned', (req, res) => {
  res.json(leerLista());
});

// POST /banned
app.post('/banned', (req, res) => {
  const lista = req.body;
  if (!Array.isArray(lista)) return res.status(400).json({ error: 'Formato inválido' });
  guardarLista(lista);
  res.json({ success: true });
});

// POST /check-banned
app.post('/check-banned', (req, res) => {
  const { user } = req.body;
  const lista = leerLista();
  res.json({ banned: lista.includes(user) });
});

// POST /unban
app.post('/unban', (req, res) => {
  const { user } = req.body;
  let lista = leerLista();
  if (!lista.includes(user)) {
    return res.json({ success: false, message: 'Usuario no está baneado' });
  }
  lista = lista.filter(u => u !== user);
  guardarLista(lista);
  res.json({ success: true });
});

const CONTADOR_FILE = './contador.json';

// Leer contador actual
function leerContador() {
  try {
    return JSON.parse(fs.readFileSync(CONTADOR_FILE)).contador || 1;
  } catch {
    return 1;
  }
}

// Guardar nuevo contador
function guardarContador(valor) {
  fs.writeFileSync(CONTADOR_FILE, JSON.stringify({ contador: valor }, null, 2));
}

// Ruta para generar nuevo ID
app.get('/nuevo-usuario', (req, res) => {
  let contador = leerContador();
  const nuevoID = `astraluser${contador}`;
  guardarContador(contador + 1);
  res.json({ id: nuevoID });
});

const USUARIOS_FILE = './usuarios.json';

// Leer usuarios
function leerUsuarios() {
  try {
    return JSON.parse(fs.readFileSync(USUARIOS_FILE));
  } catch {
    return [];
  }
}

// Guardar usuarios
function guardarUsuarios(lista) {
  fs.writeFileSync(USUARIOS_FILE, JSON.stringify(lista, null, 2));
}

// POST /registrar-usuario
app.post('/registrar-usuario', (req, res) => {
  const { id, nombre } = req.body;
  if (!id || !nombre) return res.status(400).json({ error: 'Faltan datos' });

  const usuarios = leerUsuarios();
  usuarios.push({ id, nombre, fecha: new Date().toISOString() });
  guardarUsuarios(usuarios);
  res.json({ success: true });
});

// GET /usuarios
app.get('/usuarios', (req, res) => {
  const usuarios = leerUsuarios();
  res.json(usuarios);
});

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
