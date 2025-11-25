import { Toaster as HotToaster } from 'react-hot-toast';

export default function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--primary-light)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-md)',
        },
        success: {
          iconTheme: {
            primary: 'var(--accent-seafoam)',
            secondary: 'white',
          },
        },
        error: {
          iconTheme: {
            primary: 'var(--accent-coral)',
            secondary: 'white',
          },
        },
      }}
    />
  );
}

