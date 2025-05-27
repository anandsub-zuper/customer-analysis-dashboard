import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, FileText, Tag } from 'lucide-react';

const TemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industryFocus: '',
    tags: [],
    criteria: {
      scoringFactors: ['Industry Fit', 'Feature Requirements', 'Integration Complexity', 'User Count', 'Timeline'],
      weightings: {
        'Industry Fit': 25,
        'Feature Requirements': 35,
        'Integration Complexity': 20,
        'User Count': 10,
        'Timeline': 10
      }
    }
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/config/templates`);
      const result = await response.json();
      
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      industryFocus: '',
      tags: [],
      criteria: {
        scoringFactors: ['Industry Fit', 'Feature Requirements', 'Integration Complexity', 'User Count', 'Timeline'],
        weightings: {
          'Industry Fit': 25,
          'Feature Requirements': 35,
          'Integration Complexity': 20,
          'User Count': 10,
          'Timeline': 10
        }
      }
    });
    setShowModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      industryFocus: template.industryFocus,
      tags: template.tags || [],
      criteria: template.criteria || {
        scoringFactors: ['Industry Fit', 'Feature Requirements', 'Integration Complexity', 'User Count', 'Timeline'],
        weightings: {
          'Industry Fit': 25,
          'Feature Requirements': 35,
          'Integration Complexity': 20,
          'User Count': 10,
          'Timeline': 10
        }
      }
    });
    setShowModal(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const url = editingTemplate 
        ? `/api/config/templates/${editingTemplate.id}`
        : '/api/config/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setShowModal(false);
        loadTemplates();
      } else {
        window.alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      window.alert('Error saving template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/config/templates/${templateId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        loadTemplates();
      } else {
      window.alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
     window.alert('Error deleting template');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const updateWeighting = (factor, value) => {
    setFormData({
      ...formData,
      criteria: {
        ...formData.criteria,
        weightings: {
          ...formData.criteria.weightings,
          [factor]: parseInt(value)
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analysis Templates</h1>
        <button
          onClick={handleCreateTemplate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{template.name}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditTemplate(template)}
                  className="p-1 text-gray-500 hover:text-blue-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
                {!template.isDefault && (
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">{template.description}</p>
            
            <div className="mb-4">
              <span className="text-xs font-medium text-gray-500">Industry Focus:</span>
              <p className="text-sm font-medium">{template.industryFocus}</p>
            </div>
            
            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {template.tags.map((tag, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            {template.isDefault && (
              <div className="flex items-center text-green-600 text-sm">
                <FileText className="h-4 w-4 mr-1" />
                Default Template
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Template Creation/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter template name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe this template's purpose"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry Focus
                </label>
                <input
                  type="text"
                  value={formData.industryFocus}
                  onChange={(e) => setFormData({ ...formData, industryFocus: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Construction, Field Services, General"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full flex items-center">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a tag"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    <Tag className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Scoring Criteria Weightings
                </label>
                <div className="space-y-3">
                  {formData.criteria.scoringFactors.map((factor) => (
                    <div key={factor} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{factor}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={formData.criteria.weightings[factor] || 0}
                          onChange={(e) => updateWeighting(factor, e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm font-medium w-8">
                          {formData.criteria.weightings[factor] || 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Total: {Object.values(formData.criteria.weightings).reduce((sum, value) => sum + value, 0)}%
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManagement;
