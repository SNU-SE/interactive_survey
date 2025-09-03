
import React from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div className="flex-grow flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Welcome to the Interactive Survey Builder</h1>
        <p className="text-lg text-slate-600 mb-8">Create engaging, image-based surveys for your classroom.</p>
        <div className="space-x-4">
          <Link to="/teacher" className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105">
            I'm a Teacher
          </Link>
          <Link to="/student" className="px-8 py-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-transform transform hover:scale-105">
            I'm a Student
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
