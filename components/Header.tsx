
import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-slate-800 hover:text-blue-600">
          Interactive Survey Builder
        </Link>
        <Link to="/" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <HomeIcon />
        </Link>
      </nav>
    </header>
  );
};

export default Header;
