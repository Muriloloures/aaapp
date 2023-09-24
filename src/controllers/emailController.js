const nodemailer = require('nodemailer');
const moment = require('moment');

const sendConfirmationEmail = (userEmail, eventStart) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'murilomlslouress@gmail.com',
      pass: 'puhyvmyasiuqeojm',
    },
  });

  const mailOptions = {
    from: 'seuemail@gmail.com',
    to: userEmail,
    subject: 'Consulta Agendada',
    text: `Sua consulta foi agendada para ${moment(eventStart).format('MMMM Do YYYY, h:mm a')}.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Erro ao enviar o email:', error);
    } else {
      console.log('Email enviado:', info.response);
    }
  });
};

module.exports = { sendConfirmationEmail };
