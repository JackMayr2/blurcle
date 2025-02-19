import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => (
  <nav style={{ padding: '1rem', backgroundColor: '#eee' }}>
    <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
    <Link to="/profile">Profile</Link>
  </nav>
);

export default Navbar;
