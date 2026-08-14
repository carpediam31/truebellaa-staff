import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="notfound-page">
      <h1>404</h1>
      <p>That page doesn't exist.</p>
      <Link className="btn btn-outline" to="/">Back to dashboard</Link>
    </div>
  );
}
