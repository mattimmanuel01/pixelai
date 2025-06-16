export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Style Test</h1>
        <p className="text-gray-600 mb-6">
          If you can see this styled properly with a purple-pink gradient background 
          and white card, then Tailwind CSS is working correctly.
        </p>
        <div className="flex gap-3">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Blue Button
          </button>
          <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Green Button
          </button>
        </div>
      </div>
    </div>
  )
}