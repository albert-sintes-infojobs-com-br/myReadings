import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Container, Fade, Grid, Stack, Typography } from '@mui/material';
import Header from '../components/layout/Header';

const QUOTES = [
  { text: 'Un libro es un regalo que puedes abrir una y otra vez.', author: 'Garrison Keillor' },
  { text: 'La lectura es para la mente lo que el ejercicio es para el cuerpo.', author: 'Joseph Addison' },
  { text: 'El que ama la lectura, tiene todo bajo su alcance.', author: 'William Godwin' },
  { text: 'Un niño que lee, será un adulto que piensa.', author: 'Anónimo' },
  { text: 'Leer es soñar con los ojos abiertos.', author: 'Anónimo' },
  { text: 'La lectura nos abre las puertas del mundo que te atrevas a imaginar.', author: 'Anónimo' },
  { text: 'Un lector vive mil vidas antes de morir. El que nunca lee solo vive una.', author: 'George R.R. Martin' },
  { text: 'Si no te gusta leer, no has encontrado el libro correcto.', author: 'J.K. Rowling' },
  { text: 'Cuanto más lees, más cosas sabrás. Cuantas más cosas aprendas, a más lugares viajarás.', author: 'Dr. Seuss' },
  {
    text: 'Un libro abierto es un cerebro que habla; cerrado, un amigo que espera; olvidado, un alma que perdona; destruido, un corazón que llora.',
    author: 'Proverbio hindú',
  },
  { text: 'Hay más tesoros en los libros que en todo el botín de los piratas de la Isla del Tesoro.', author: 'Walt Disney' },
];

const FEATURES = [
  {
    icon: '👨‍👩‍👧',
    title: 'Perfiles Familiares',
    description: 'Cuentas independientes para padres (gestores) e hijos (lectores), adaptadas a las necesidades de cada uno.',
  },
  {
    icon: '📚',
    title: 'Biblioteca a Medida',
    description: 'Registra y gestiona los libros que tus hijos van a leer de forma fácil y organizada.',
  },
  {
    icon: '🏆',
    title: 'Metas y Recompensas',
    description: 'Crea incentivos reales (como una consola o un paseo al parque) asignándoles un valor en puntos y una fecha límite.',
  },
  {
    icon: '🎯',
    title: 'Puntuación Dinámica',
    description: 'Tú decides el valor de cada libro: asigna más puntos a los retos de lectura más grandes.',
  },
  {
    icon: '📊',
    title: 'Dashboard Infantil',
    description: 'Un panel visual e intuitivo para que los niños sigan su progreso, vean sus logros y sepan cuánto les falta para su premio.',
  },
];

const STEPS = [
  {
    icon: '👤',
    title: 'Crea tu cuenta familiar',
    description: 'Regístrate como padre o madre, añade a tus hijos y dales acceso a su propio panel interactivo.',
  },
  {
    icon: '🎁',
    title: 'Define los retos y premios',
    description: 'Sube los libros, asígnales un valor en puntos y establece la gran recompensa que tu hijo quiere conseguir.',
  },
  {
    icon: '🚀',
    title: '¡Lee, suma y canjea!',
    description: 'Tu hijo registra sus lecturas, sigue su progreso en su dashboard visual y, al alcanzar los puntos... ¡reclama su merecido premio!',
  },
];

function RotatingQuotes() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 500);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const quote = QUOTES[index];
  return (
    <Fade in={visible} timeout={500}>
      <Box textAlign="center" minHeight={120}>
        <Typography variant="h5" fontStyle="italic" gutterBottom>
          "{quote.text}"
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          — {quote.author}
        </Typography>
      </Box>
    </Fade>
  );
}

export default function LandingPage() {
  return (
    <Box bgcolor="background.default" minHeight="100vh">
      <Header />

      <Box id="inicio" bgcolor="primary.main" color="primary.contrastText" py={10}>
        <Container maxWidth="md">
          <Typography variant="h3" align="center" gutterBottom>
            MyReadings
          </Typography>
          <RotatingQuotes />
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 8 }}>
        <Stack spacing={10}>
          <Box id="objetivo">
            <Typography variant="h4" gutterBottom>
              Transformamos la lectura en una gran aventura
            </Typography>
            <Typography color="text.secondary" fontSize="1.1rem">
              Nuestro objetivo es fomentar el hábito de la lectura en los más pequeños de la casa de
              una forma divertida y motivadora. Queremos que leer deje de ser una obligación y se
              convierta en un juego interactivo donde cada página descubierta los acerque un paso más
              a sus metas.
            </Typography>
          </Box>

          <Box id="funcionalidades">
            <Typography variant="h4" gutterBottom textAlign="center">
              Funcionalidades
            </Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {FEATURES.map((feature) => (
                <Grid item xs={12} sm={6} md={4} key={feature.title}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h3" component="div" gutterBottom>
                        {feature.icon}
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography color="text.secondary">{feature.description}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box id="como-funciona">
            <Typography variant="h4" gutterBottom textAlign="center">
              El camino hacia la lectura en 3 simples pasos
            </Typography>
            <Grid container spacing={4} sx={{ mt: 1 }}>
              {STEPS.map((step, i) => (
                <Grid item xs={12} md={4} key={step.title}>
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <Typography variant="h2" color="primary" fontWeight="bold">
                      {i + 1}
                    </Typography>
                    <Typography variant="h6">
                      {step.icon} {step.title}
                    </Typography>
                    <Typography color="text.secondary">{step.description}</Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

