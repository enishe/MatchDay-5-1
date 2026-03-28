import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Marrja e të dhënave (Read)
  const fetchMatches = () => {
    fetch('http://localhost:5000/api/matches')
      .then(response => response.json())
      .then(data => {
        setMatches(data);
        setLoading(false);
      })
      .catch(error => console.error('Gabim:', error));
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // 2. Funksioni për Ndryshimin e Statusit (Update - Bonus)
  const handleUpdateStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'pending' ? 'confirmed' : 'canceled';
    
    fetch(`http://localhost:5000/api/matches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    })
    .then(() => fetchMatches()) // Rifresko listën
    .catch(err => console.error(err));
  };

  // 3. Funksioni për Fshirje (Delete - Bonus)
  const handleDelete = (id) => {
    if(window.confirm("A jeni i sigurt që dëshironi ta fshini këtë rezervim?")) {
      fetch(`http://localhost:5000/api/matches/${id}`, {
        method: 'DELETE'
      })
      .then(() => fetchMatches())
      .catch(err => console.error(err));
    }
  };

  return (
    <div className="App">
      <h1>🏆 MatchDay 5+1 - Menaxhimi i Ndeshjeve</h1>
      
      {loading ? <p>Duke u ngarkuar...</p> : (
        <table border="1" style={{ width: '100%', marginTop: '20px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#2ecc71', color: 'white' }}>
              <th>ID</th>
              <th>Terreni</th>
              <th>Data dhe Koha</th>
              <th>Çmimi</th>
              <th>Statusi</th>
              <th>Veprimet (Bonus)</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(match => (
              <tr key={match.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td>{match.id}</td>
                <td>Fusha #{match.field_id}</td>
                <td>{new Date(match.start_time).toLocaleString()}</td>
                <td>{match.total_price}€ ({match.price_per_player}€/lojtar)</td>
                <td>
                  <b style={{ color: match.status === 'confirmed' ? 'green' : match.status === 'canceled' ? 'red' : 'orange' }}>
                    {match.status.toUpperCase()}
                  </b>
                </td>
                <td>
                  <button onClick={() => handleUpdateStatus(match.id, match.status)} style={{ marginRight: '5px', cursor: 'pointer' }}>
                    🔄 Ndrysho Status
                  </button>
                  <button onClick={() => handleDelete(match.id)} style={{ color: 'white', backgroundColor: '#e74c3c', border: 'none', cursor: 'pointer' }}>
                    🗑️ Fshi
                  </button>
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