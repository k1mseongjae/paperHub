import { Link } from 'react-router-dom';

const WelcomePage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <h1 className="text-3xl font-bold text-indigo-600">PaperHub</h1>
        <nav>
          <Link to="/login" className="px-4 py-2 text-indigo-600 font-semibold rounded-md hover:bg-indigo-50">
            Log In
          </Link>
          <Link to="/signup" className="ml-2 px-4 py-2 text-white font-semibold bg-indigo-600 rounded-md hover:bg-indigo-700">
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="text-center mt-20 md:mt-32 px-4">
        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900">
          Your Personal Paper Hub
        </h2>
        <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-gray-600">
          Organize, read, and connect your academic papers like never before.
          All in one place.
        </p>
        <div className="mt-10">
          <Link to="/signup" className="px-8 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition-transform transform hover:scale-105">
            Get Started for Free
          </Link>
        </div>
      </main>

      {/* Features Section */}
      <section className="mt-24 md:mt-32 py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900">Features</h3>
          <div className="grid md:grid-cols-3 gap-10 mt-12">
            <div className="p-8 bg-white rounded-xl shadow-md text-center">
              <h4 className="text-xl font-semibold">Search and Discover</h4>
              <p className="mt-2 text-gray-600">Easily find papers via direct arXiv search or explore our curated subject categories.</p>
            </div>
            <div className="p-8 bg-white rounded-xl shadow-md text-center">
              <h4 className="text-xl font-semibold">Interactive Reading</h4>
              <p className="mt-2 text-gray-600">Highlight and take notes directly on your PDFs.</p>
            </div>
            <div className="p-8 bg-white rounded-xl shadow-md text-center">
              <h4 className="text-xl font-semibold">Graph Viewer & Recommendations</h4>
              <p className="mt-2 text-gray-600">Visualize paper connections and get personalized recommendations based on your reading history.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WelcomePage;
