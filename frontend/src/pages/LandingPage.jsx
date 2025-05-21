import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, BarChart2, Database, ChevronRight, Upload, PieChart, Check } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <BarChart2 className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-xl font-bold text-blue-700">Customer Analysis Dashboard</h1>
          </div>
          <button 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            onClick={handleGetStarted}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Analyze Customer Fit with AI-Powered Intelligence
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Transform meeting transcripts into actionable insights. Identify your best-fit customers and make data-driven decisions with our advanced analysis platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                onClick={handleGetStarted}
              >
                Start Analyzing
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
              <button className="border border-blue-600 text-blue-600 px-6 py-3 rounded-md hover:bg-blue-50 transition-colors">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Upload className="h-8 w-8 text-blue-600" />}
              title="AI Transcript Analysis"
              description="Upload meeting transcripts or select from Google Docs. Our AI extracts key information and provides detailed customer fit analysis."
            />
            <FeatureCard 
              icon={<Database className="h-8 w-8 text-blue-600" />}
              title="Historical Data Integration"
              description="Leverage your historical customer data from Google Sheets and Forms to make smarter recommendations."
            />
            <FeatureCard 
              icon={<PieChart className="h-8 w-8 text-blue-600" />}
              title="Comprehensive Dashboard"
              description="Visualize customer fit data, explore historical patterns, and gain actionable insights."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col space-y-8">
              <Step 
                number="1"
                title="Upload or Select a Transcript"
                description="Upload a meeting transcript file or select from your connected Google Docs."
              />
              <Step 
                number="2"
                title="AI-Powered Analysis"
                description="Our AI analyzes the transcript against historical customer data to identify patterns and requirements."
              />
              <Step 
                number="3"
                title="Review Fit Analysis"
                description="Get detailed fit score, strengths, challenges, and recommendations based on similar customers."
              />
              <Step 
                number="4"
                title="Make Data-Driven Decisions"
                description="Use the insights to prioritize prospects, refine your approach, and improve customer success."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Benefits</h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <BenefitItem 
              title="Save Time on Analysis"
              description="Automate the process of extracting and analyzing customer requirements from meeting transcripts."
            />
            <BenefitItem 
              title="Increase Win Rates"
              description="Focus on high-fit prospects with tailored approaches based on successful customer patterns."
            />
            <BenefitItem 
              title="Improve Customer Success"
              description="Set the right expectations and implementation plans based on similar customer experiences."
            />
            <BenefitItem 
              title="Data-Driven Decision Making"
              description="Replace gut feelings with objective analysis backed by your historical customer data."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Start analyzing your customer meetings and make smarter decisions today.
          </p>
          <button 
            className="bg-white text-blue-600 px-8 py-3 rounded-md hover:bg-blue-50 transition-colors font-semibold"
            onClick={handleGetStarted}
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-800 text-gray-300">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <BarChart2 className="h-6 w-6 text-blue-400 mr-2" />
              <span className="text-lg font-semibold">Customer Analysis Dashboard</span>
            </div>
            <div className="text-sm">
              &copy; {new Date().getFullYear()} Your Company. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper Components
const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow transition-shadow">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const Step = ({ number, title, description }) => (
  <div className="flex">
    <div className="mr-6">
      <div className="bg-blue-600 text-white h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg">
        {number}
      </div>
    </div>
    <div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
);

const BenefitItem = ({ title, description }) => (
  <div className="flex">
    <div className="mr-4 mt-1">
      <div className="bg-green-100 text-green-600 h-6 w-6 rounded-full flex items-center justify-center">
        <Check className="h-4 w-4" />
      </div>
    </div>
    <div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
);

export default LandingPage;
