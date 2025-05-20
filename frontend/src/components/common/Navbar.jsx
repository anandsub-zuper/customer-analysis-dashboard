import React from 'react';
import { HelpCircle, Settings } from 'lucide-react';

const Navbar = () => {
  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div className="text-xl font-semibold">Customer Analysis Dashboard</div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
          <HelpCircle className="h-5 w-5" />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
