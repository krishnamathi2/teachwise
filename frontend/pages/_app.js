import '../styles/globals.css';
// import { AppProps } from 'next/app'; // TypeScript types are not used in JS files
import { TrialProvider } from '../context/TrialContext';

function MyApp({ Component, pageProps }) {
  return (
    <TrialProvider>
      <Component {...pageProps} />
    </TrialProvider>
  );
}

export default MyApp;
