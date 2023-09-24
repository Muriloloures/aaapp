const express = require('express');
const { MongoClient } = require('mongodb');
const routes = require('../src/routes/routes.js'); // Importa as rotas definidas no arquivo "routes.js"
const cors = require('cors');

const dotenv = require('dotenv');
dotenv.config();


const app = express();
const port = process.env.PORT || 5000;

// Middleware para fazer o parse do corpo das requisições como JSON
app.use(express.json());
app.use(cors());

// Função para conectar ao MongoDB
async function connectToDatabase() {
  const url = 'mongodb://localhost:27017/tcc';
  try {
    const client = await MongoClient.connect(url, { useUnifiedTopology: true });
    console.log('Conexão com o MongoDB estabelecida com sucesso!');
    return client.db(); // Retorna a referência ao banco de dados.
  } catch (err) {
    console.error('Erro ao conectar-se ao MongoDB:', err);
    throw err;
  }
}

// Middleware para conectar ao MongoDB antes de cada requisição
app.use(async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    req.db = db; // Adiciona a referência ao banco de dados na requisição
    next();
  } catch (err) {
    res.status(500).send('Erro ao conectar-se ao banco de dados.');
  }
});

// Usando as rotas definidas no arquivo "routes.js" e passando a referência do banco de dados como parâmetro
app.use(routes({ connectToDatabase }));

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});



// const express = require('express');
// const { MongoClient } = require('mongodb');
// const routes = require('../src/routes/routes.js'); // Importa as rotas definidas no arquivo "routes.js"
// const cors = require('cors');

// const app = express();
// const port = 5000;

// // Middleware para fazer o parse do corpo das requisições como JSON
// app.use(express.json());
// app.use(cors());

// // Função para conectar ao MongoDB
// async function connectToDatabase() {
//   const url = 'mongodb://localhost:27017/tcc';
//   try {
//     const client = await MongoClient.connect(url, { useUnifiedTopology: true });
//     console.log('Conexão com o MongoDB estabelecida com sucesso!');
//     return client.db(); // Retorna a referência ao banco de dados.
//   } catch (err) {
//     console.error('Erro ao conectar-se ao MongoDB:', err);
//     throw err;
//   }
// }

// // Middleware para conectar ao MongoDB antes de cada requisição
// app.use(async (req, res, next) => {
//   try {
//     const db = await connectToDatabase();
//     req.db = db; // Adiciona a referência ao banco de dados na requisição
//     next();
//   } catch (err) {
//     res.status(500).send('Erro ao conectar-se ao banco de dados.');
//   }
// });

// // Usando as rotas definidas no arquivo "routes.js" e passando a referência do banco de dados como parâmetro
// app.use(routes({ connectToDatabase }));

// app.listen(port, () => {
//   console.log(`Servidor rodando na porta ${port}`);
// });

