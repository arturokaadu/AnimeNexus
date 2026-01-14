export const Footer = () => {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '2rem',
      color: 'rgba(255,255,255,0.5)',
      fontSize: '0.9rem',
      marginTop: 'auto'
    }}>
      <div style={{ marginBottom: '0.5rem' }}>
        &copy; {new Date().getFullYear()} <strong>Zenith Streaming</strong>
      </div>
      <div>
        Created by Arturo Kaadú
      </div>
    </footer>
  );
};
