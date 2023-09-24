// models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  scheduledDates: {
    type: [Date], // Array de datas dos agendamentos
    default: [], // Valor padrão: array vazio
  },
});

const User = mongoose.model('Users', userSchema);

module.exports = User;
