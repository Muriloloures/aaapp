const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendConfirmationEmail } = require("../controllers/emailController")

const routes = express.Router();

function createRoutes({ connectToDatabase }) {
  // Função para gerar o token JWT
  function generateToken(email) {
    const expiresInOneYear = 365 * 24 * 60 * 60;

    return jwt.sign({ email }, 'chave-secreta', {
      expiresIn: expiresInOneYear
    }); // Defina uma chave secreta mais segura na produção
  }

  routes.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
  
      const user = await usersCollection.findOne({ email });
  
      if (user) {
        const passwordMatch = await bcrypt.compare(password, user.password);
  
        if (passwordMatch) {
          console.log('Usuário autenticado:', user.email);
  
          const token = generateToken(user.email);
          res.json({ token, message: 'Login bem-sucedido!' });
        } else {
          console.log('Credenciais inválidas.');
          res.status(401).send('Credenciais inválidas.');
        }
      } else {
        console.log('Usuário não encontrado.');
        res.status(401).send('Usuário não encontrado.');
      }
    } catch (err) {
      console.error('Erro ao realizar login:', err);
      res.status(500).send('Erro ao realizar login.');
    }
  });
  

  routes.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');

      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        console.log('Usuário com este email já existe.');
        res.status(409).send('Usuário com este email já existe.');
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
          name,
          email,
          password: hashedPassword,
          scheduledDates: []
        };
        await usersCollection.insertOne(newUser);

        console.log('Novo usuário registrado:', newUser.email);
        res.send('Registro bem-sucedido!');
      }
    } catch (err) {
      console.error('Erro ao realizar registro:', err);
      res.status(500).send('Erro ao realizar registro.');
    }
  });
  

  routes.get('/user', async (req, res) => {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decodedToken = jwt.verify(token, 'chave-secreta');

      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
      const user = await usersCollection.findOne({ email: decodedToken.email });

      if (user) {
        res.json({ name: user.name, email: user.email });
      } else {
        res.status(404).send('Usuário não encontrado.');
      }
    } catch (err) {
      console.error('Erro ao obter detalhes do usuário:', err);
      res.status(500).send('Erro ao obter detalhes do usuário.');
    }
  });

  
    routes.post('/schedule', async (req, res) => {
    const { token, event } = req.body;
  
    try {
      const decodedToken = jwt.verify(token, 'chave-secreta');
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
  
      const user = await usersCollection.findOne({ email: decodedToken.email });
  
      if (user) {
        // Store only the latest event in the scheduledDates array
        await usersCollection.updateOne(
          { email: decodedToken.email },
          { $set: { scheduledDates: [event] } }
        );
  
        res.status(200).json({ message: 'Event scheduled successfully.' });
      } else {
        res.status(404).send('User not found.');
      }
    } catch (err) {
      console.error('Error scheduling event:', err);
      res.status(500).send('Error scheduling event.');
    }
  });  


  routes.get('/user/schedule', async (req, res) => {
    const { authorization } = req.headers;
    const token = authorization.split(' ')[1];
  
    try {
      const decodedToken = jwt.verify(token, 'chave-secreta');
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
  
      const user = await usersCollection.findOne({ email: decodedToken.email });
  
      if (user) {
        res.status(200).json({ scheduledDates: user.scheduledDates || [] });
      } else {
        res.status(404).send('User not found.');
      }
    } catch (err) {
      console.error('Error fetching scheduled events:', err);
      res.status(500).send('Error fetching scheduled events.');
    }
  });

    routes.post('/cancel', async (req, res) => {
    const { token, eventId } = req.body;
  
    try {
      const decodedToken = jwt.verify(token, 'chave-secreta');
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
  
      const user = await usersCollection.findOne({ email: decodedToken.email });
  
      if (user) {
        // Find and remove the canceled event from the scheduledDates array
        const updatedScheduledDates = user.scheduledDates.filter(event => event.id !== eventId);
        await usersCollection.updateOne(
          { email: decodedToken.email },
          { $set: { scheduledDates: updatedScheduledDates } }
        );
  
        res.status(200).json({ message: 'Event canceled successfully.' });
      } else {
        res.status(404).send('User not found.');
      }
    } catch (err) {
      console.error('Error canceling event:', err);
      res.status(500).send('Error canceling event.');
    }
  });

  routes.get('/all-schedule', async (req, res) => {
    try {
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
  
      const allUsers = await usersCollection.find({}).toArray();
  
      const allScheduledDates = allUsers.map(user => user.scheduledDates).flat();
  
      res.status(200).json(allScheduledDates);
    } catch (err) {
      console.error('Error fetching all scheduled events:', err);
      res.status(500).send('Error fetching all scheduled events.');
    }
  });

  routes.post('/api/send-email', async (req, res) => {
    const { userEmail, eventStart } = req.body;
  
    try {
      await sendConfirmationEmail(userEmail, eventStart);
      res.status(200).json({ message: 'Email enviado com sucesso.' });
    } catch (error) {
      console.error('Erro ao enviar o email:', error);
      res.status(500).json({ error: 'Erro ao enviar o email.' });
    }
  });

  routes.post('/cancel-appointment', async (req, res) => {
    const { token, eventId } = req.body;
  
    try {
      // Verifique se o token é válido
      const decodedToken = jwt.verify(token, 'chave-secreta'); // Lembre-se de usar uma chave segura na produção
  
      // Consulte o banco de dados para encontrar o usuário com base no token
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
      const user = await usersCollection.findOne({ email: decodedToken.email });
  
      if (user) {
        // Verifique se o evento a ser cancelado existe na lista de agendamentos do usuário
        const eventIndex = user.scheduledDates.findIndex(event => event.id === eventId);
  
        if (eventIndex !== -1) {
          // Remova o evento da lista de agendamentos do usuário
          user.scheduledDates.splice(eventIndex, 1);
  
          // Atualize o usuário no banco de dados para refletir o cancelamento
          await usersCollection.updateOne(
            { email: decodedToken.email },
            { $set: { scheduledDates: user.scheduledDates } }
          );
  
          res.status(200).json({ message: 'Agendamento cancelado com sucesso.' });
        } else {
          res.status(404).send('Evento não encontrado no agendamento do usuário.');
        }
      } else {
        res.status(404).send('Usuário não encontrado.');
      }
    } catch (err) {
      console.error('Erro ao cancelar o agendamento:', err);
      res.status(500).send('Erro ao cancelar o agendamento.');
    }
  });
  
  
  return routes;
}

module.exports = createRoutes;



// const express = require('express');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');

// const routes = express.Router();

// function createRoutes({ connectToDatabase }) {
//   // Função para gerar o token JWT
//   function generateToken(email) {
//     return jwt.sign({ email }, 'chave-secreta', {
//       expiresIn: '1h'
//     }); // Defina uma chave secreta mais segura na produção
//   }

//   routes.post('/login', async (req, res) => {
//     const { email, password } = req.body;
  
//     try {
//       const db = await connectToDatabase();
//       const usersCollection = db.collection('users');
  
//       const user = await usersCollection.findOne({ email });
  
//       if (user) {
//         const passwordMatch = await bcrypt.compare(password, user.password);
  
//         if (passwordMatch) {
//           console.log('Usuário autenticado:', user.email);
  
//           const token = generateToken(user.email);
//           res.json({ token, message: 'Login bem-sucedido!' });
//         } else {
//           console.log('Credenciais inválidas.');
//           res.status(401).send('Credenciais inválidas.');
//         }
//       } else {
//         console.log('Usuário não encontrado.');
//         res.status(401).send('Usuário não encontrado.');
//       }
//     } catch (err) {
//       console.error('Erro ao realizar login:', err);
//       res.status(500).send('Erro ao realizar login.');
//     }
//   });
  

//   routes.post('/register', async (req, res) => {
//     const { name, email, password } = req.body;

//     try {
//       const db = await connectToDatabase();
//       const usersCollection = db.collection('users');

//       const existingUser = await usersCollection.findOne({ email });

//       if (existingUser) {
//         console.log('Usuário com este email já existe.');
//         res.status(409).send('Usuário com este email já existe.');
//       } else {
//         const hashedPassword = await bcrypt.hash(password, 10);

//         const newUser = {
//           name,
//           email,
//           password: hashedPassword,
//           scheduledDates: []
//         };
//         await usersCollection.insertOne(newUser);

//         console.log('Novo usuário registrado:', newUser.email);
//         res.send('Registro bem-sucedido!');
//       }
//     } catch (err) {
//       console.error('Erro ao realizar registro:', err);
//       res.status(500).send('Erro ao realizar registro.');
//     }
//   });

//   routes.get('/user', async (req, res) => {
//     try {
//       const token = req.headers.authorization.split(' ')[1];
//       const decodedToken = jwt.verify(token, 'chave-secreta');

//       const db = await connectToDatabase();
//       const usersCollection = db.collection('users');
//       const user = await usersCollection.findOne({ email: decodedToken.email });

//       if (user) {
//         res.json({ name: user.name, email: user.email });
//       } else {
//         res.status(404).send('Usuário não encontrado.');
//       }
//     } catch (err) {
//       console.error('Erro ao obter detalhes do usuário:', err);
//       res.status(500).send('Erro ao obter detalhes do usuário.');
//     }
//   });

//   routes.post('/schedule', async (req, res) => {
//     const { token, event } = req.body;
  
//     try {
//       const decodedToken = jwt.verify(token, 'chave-secreta');
//       const db = await connectToDatabase();
//       const usersCollection = db.collection('users');
  
//       const user = await usersCollection.findOne({ email: decodedToken.email });
  
//       if (user) {
//         // Store only the latest event in the scheduledDates array
//         await usersCollection.updateOne(
//           { email: decodedToken.email },
//           { $set: { scheduledDates: [event] } }
//         );
  
//         res.status(200).json({ message: 'Event scheduled successfully.' });
//       } else {
//         res.status(404).send('User not found.');
//       }
//     } catch (err) {
//       console.error('Error scheduling event:', err);
//       res.status(500).send('Error scheduling event.');
//     }
//   });

//   routes.get('/user/schedule', async (req, res) => {
//     const { authorization } = req.headers;
//     const token = authorization.split(' ')[1];
  
//     try {
//       const decodedToken = jwt.verify(token, 'chave-secreta');
//       const db = await connectToDatabase();
//       const usersCollection = db.collection('users');
  
//       const user = await usersCollection.findOne({ email: decodedToken.email });
  
//       if (user) {
//         res.status(200).json({ scheduledDates: user.scheduledDates || [] });
//       } else {
//         res.status(404).send('User not found.');
//       }
//     } catch (err) {
//       console.error('Error fetching scheduled events:', err);
//       res.status(500).send('Error fetching scheduled events.');
//     }
//   });

//   routes.post('/cancel', async (req, res) => {
//     const { token, eventId } = req.body;
  
//     try {
//       const decodedToken = jwt.verify(token, 'chave-secreta');
//       const db = await connectToDatabase();
//       const usersCollection = db.collection('users');
  
//       const user = await usersCollection.findOne({ email: decodedToken.email });
  
//       if (user) {
//         // Find and remove the canceled event from the scheduledDates array
//         const updatedScheduledDates = user.scheduledDates.filter(event => event.id !== eventId);
//         await usersCollection.updateOne(
//           { email: decodedToken.email },
//           { $set: { scheduledDates: updatedScheduledDates } }
//         );
  
//         res.status(200).json({ message: 'Event canceled successfully.' });
//       } else {
//         res.status(404).send('User not found.');
//       }
//     } catch (err) {
//       console.error('Error canceling event:', err);
//       res.status(500).send('Error canceling event.');
//     }
//   });
  
  

//   return routes;
// }

// module.exports = createRoutes;

