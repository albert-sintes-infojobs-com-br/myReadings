import { useEffect, useState } from 'react';
import { Box, Container, Fade, Grid, Paper, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import InsightsIcon from '@mui/icons-material/Insights';
import CategoryIcon from '@mui/icons-material/Category';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import Header from '../components/layout/Header';
import AuthButtons from '../components/layout/AuthButtons';

const HERO_GRADIENT = 'linear-gradient(135deg, #6d28d9 0%, #4338ca 50%, #1e40af 100%)';
const AMBER = '#f59e0b';
const AMBER_LIGHT = '#fbbf24';

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

const OBJETIVO_CHECKLIST = [
  'Retos pensados para la edad de cada peque',
  'Puntos por cada página y libro terminado',
  'Recompensas reales pactadas en familia',
];

const FEATURES = [
  {
    Icon: PeopleAltIcon,
    color: '#7c3aed',
    bg: '#ede9fe',
    title: 'Perfiles Familiares',
    description: 'Cuentas independientes para padres (gestores) e hijos (lectores), adaptadas a las necesidades de cada uno.',
  },
  {
    Icon: AutoStoriesIcon,
    color: '#2563eb',
    bg: '#dbeafe',
    title: 'Biblioteca a Medida',
    description: 'Registra y gestiona los libros que tus hijos van a leer de forma fácil y organizada.',
  },
  {
    Icon: EmojiEventsIcon,
    color: '#d97706',
    bg: '#fef3c7',
    title: 'Metas y Recompensas',
    description: 'Crea incentivos reales (como una consola o un paseo al parque) asignándoles un valor en puntos y una fecha límite.',
  },
  {
    Icon: CategoryIcon,
    color: '#4f46e5',
    bg: '#e0e7ff',
    title: 'Categorías',
    description: 'Organiza las lecturas por género o temática para descubrir nuevos intereses.',
  },
  {
    Icon: GpsFixedIcon,
    color: '#db2777',
    bg: '#fce7f3',
    title: 'Puntuación Dinámica',
    description: 'Tú decides el valor de cada libro: asigna más puntos a los retos de lectura más grandes.',
  },
  {
    Icon: InsightsIcon,
    color: '#0d9488',
    bg: '#ccfbf1',
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
      <Box
        textAlign="center"
        minHeight={140}
        sx={{
          position: 'relative',
          bgcolor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          backdropFilter: 'blur(6px)',
          p: 4,
          pt: 5,
        }}
      >
        <Box
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          sx={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: AMBER,
          }}
        >
          <FormatQuoteIcon sx={{ color: '#1f2937' }} />
        </Box>
        <Typography
          variant="h5"
          fontStyle="italic"
          gutterBottom
          sx={{ fontFamily: '"Fraunces", "Fraunces Fallback", ui-serif, Georgia, serif' }}
        >
          "{quote.text}"

        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>
          — {quote.author} —
        </Typography>
      </Box>
    </Fade>
  );
}

export default function LandingPage() {
  return (
    <Box bgcolor="background.default" minHeight="100vh">
      <Header />

      <Box id="inicio" sx={{ background: HERO_GRADIENT, color: '#fff', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Stack alignItems="center" spacing={3}>
            <Box
              display="inline-flex"
              alignItems="center"
              gap={1}
              sx={{
                bgcolor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 5,
                px: 2,
                py: 0.75,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 18, color: AMBER_LIGHT }} />
              <Typography variant="body2" fontWeight="bold">
                La lectura, convertida en aventura
              </Typography>
            </Box>
            <Typography variant="h2" fontWeight="bold" align="center">
              My<Box component="span" sx={{ color: AMBER_LIGHT }}>Readings</Box>
            </Typography>
            <Box width="100%">
              <RotatingQuotes />
            </Box>
            <Box
              display="flex"
              justifyContent="center"
              sx={{
                '& .MuiButton-outlined': { color: 'inherit', borderColor: 'rgba(255,255,255,0.6)' },
                '& .MuiButton-contained': { bgcolor: AMBER, color: '#1f2937', '&:hover': { bgcolor: AMBER_LIGHT } },
              }}
            >
              <AuthButtons mode="page" loginTrigger="button" size="large" />
            </Box>
          </Stack>
        </Container>
      </Box>

      <Box bgcolor="#f5f3ff">
        <Container maxWidth="md" sx={{ py: 10 }}>
          <Box id="objetivo">
            <Box
              display="inline-flex"
              alignItems="center"
              gap={0.75}
              sx={{ bgcolor: '#fce7f3', color: '#be185d', borderRadius: 5, px: 1.5, py: 0.5, mb: 2 }}
            >
              <FavoriteIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" fontWeight="bold">
                NUESTRO OBJETIVO
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Transformamos la lectura en una{' '}
              <Box component="span" sx={{ color: '#7c3aed' }}>
                gran aventura
              </Box>
            </Typography>
            <Typography color="text.secondary" fontSize="1.1rem" sx={{ mb: 3, maxWidth: 640 }}>
              Nuestro objetivo es fomentar el hábito de la lectura en los más pequeños de la casa de
              una forma divertida y motivadora. Queremos que leer deje de ser una obligación y se
              convierta en un juego interactivo donde cada página descubierta los acerque un paso más
              a sus metas.
            </Typography>
            <Stack spacing={1.5}>
              {OBJETIVO_CHECKLIST.map((item) => (
                <Stack key={item} direction="row" spacing={1.5} alignItems="center">
                  <CheckCircleIcon sx={{ color: '#22c55e' }} />
                  <Typography>{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 10 }}>
        <Stack spacing={10}>
          <Box id="funcionalidades">
            <Typography variant="h4" fontWeight="bold" gutterBottom textAlign="center">
              Funcionalidades
            </Typography>
            <Typography color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
              Herramientas pensadas para que los padres guíen y los peques disfruten.
            </Typography>
            <Grid container spacing={3}>
              {FEATURES.map((feature) => (
                <Grid item xs={12} sm={6} md={4} key={feature.title}>
                  <Paper variant="outlined" sx={{ height: '100%', p: 3, borderRadius: 3 }}>
                    <Box
                      display="inline-flex"
                      alignItems="center"
                      justifyContent="center"
                      sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: feature.bg, mb: 2 }}
                    >
                      <feature.Icon sx={{ color: feature.color }} />
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">{feature.description}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box id="como-funciona">
            <Typography variant="h4" fontWeight="bold" gutterBottom textAlign="center">
              El camino hacia la lectura en 3 simples pasos
            </Typography>
            <Grid container spacing={4} sx={{ mt: 1 }}>
              {STEPS.map((step, i) => (
                <Grid item xs={12} md={4} key={step.title}>
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%', textAlign: 'center' }}>
                    <Box
                      display="inline-flex"
                      alignItems="center"
                      justifyContent="center"
                      sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: AMBER, color: '#1f2937', fontWeight: 'bold', mb: 2 }}
                    >
                      {i + 1}
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {step.icon} {step.title}
                    </Typography>
                    <Typography color="text.secondary">{step.description}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      </Container>

      <Box component="footer" borderTop={1} borderColor="divider" py={3}>
        <Container maxWidth="md">
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LibraryBooksIcon color="primary" fontSize="small" />
              <Typography fontWeight="bold">MyReadings</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Hecho con cariño para familias lectoras.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

