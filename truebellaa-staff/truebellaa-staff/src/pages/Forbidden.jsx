import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div className="forbidden-page">
      <h1>403</h1>
      <p>Your account doesn't have permission to view this page. If this seems wrong, ask an Admin to check your role.</p>
      <Link className="btn btn-outline" to="/">Back to dashboard</Link>
    </div>
  );
}
