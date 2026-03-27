import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Merr të dhënat nga API (Backend-i që ndezëm)
  useEffect(() => {
    fetch('http://localhost:5000/api/matches')
      .then(response => response.json())
      .then(data => {
        setMatches(data);
        setLoading(false);
      })
      .catch(error => console.error('Gabim gjatë marrjes së të dhënave:', error));
  }, []);

  return (
    <div className="App">
      <h1>🏆 MatchDay 5+1 - Lista e Ndeshjeve</h1>
      
      {loading ? <p>Duke u ngarkuar...</p> : (
        <table border="1" style={{ width: '100%', marginTop: '20px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#2ecc71', color: 'white' }}>
              <th>ID</th>
              <th>Terreni (Field ID)</th>
              <th>Data dhe Koha</th>
              <th>Çmimi Total</th>
              <th>Për Lojtar</th>
              <th>Statusi</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(match => (
              <tr key={match.id}>
                <td>{match.id}</td>
                <td>Fusha #{match.field_id}</td>
                <td>{new Date(match.start_time).toLocaleString()}</td>
                <td>{match.total_price}€</td>
                <td>{match.price_per_player}€</td>
                <td>
                  <span style={{ 
                    color: match.status === 'confirmed' ? 'green' : 'orange',
                    fontWeight: 'bold' 
                  }}>
                    {match.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;