// src/pages/Historical.jsx
import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Clock } from 'lucide-react';
import Button from '../components/common/Button';
import { listSheets, getSheetData } from '../api/sheetsApi';

const Historical = () => {
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheetData, setSheetData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load sheets on component mount
  useEffect(() => {
    const loadSheets = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const sheetsData = await listSheets();
        setSheets(sheetsData);
        if (sheetsData.length > 0) {
          setSelectedSheet(sheetsData[0].title);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading sheets:', err);
        setError('Error loading sheets. Please check your configuration and try again.');
        setIsLoading(false);
      }
    };
    
    loadSheets();
  }, []);
  
  // Load sheet data when a sheet is selected
  useEffect(() => {
    if (selectedSheet) {
      const loadSheetData = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          // Let backend use its configured spreadsheet ID
          // Use AO1000 to match backend's HISTORICAL_DATA_RANGE config
          const range = `${selectedSheet}!A1:AO1000`;
          
          // Don't pass spreadsheetId - let backend use its configured value
          const data = await getSheetData(null, range);
          setSheetData(data);
          setIsLoading(false);
        } catch (err) {
          console.error('Error loading sheet data:', err);
          setError('Error loading sheet data. Please try again.');
          setIsLoading(false);
        }
      };
      
      loadSheetData();
    }
  }, [selectedSheet]);
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Historical Customer Data</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="font-medium">Google Sheets Data Source</h2>
            </div>
            {isLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>Last synced: {new Date().toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
        
        {sheets.length > 0 && (
          <div className="p-4 border-b">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Select Sheet:</label>
              <select
                className="p-2 border border-gray-300 rounded-md"
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                disabled={isLoading}
              >
                {sheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.title}>
                    {sheet.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          {sheetData.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {sheetData[0].map((header, index) => (
                    <th 
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sheetData.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td 
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {cell || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500">
              {isLoading ? 'Loading data...' : sheets.length === 0 ? 'No sheets available' : 'No data available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Historical;
