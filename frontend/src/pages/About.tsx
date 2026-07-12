export default function About() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 relative overflow-hidden bg-gray-900"
      style={{ backgroundImage: "url(https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=1600&q=80)", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-emerald-900/30 animate-gradient" />
      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="TerraPulse" className="h-16 w-16 mx-auto rounded-2xl object-cover" />
          <h1 className="text-3xl font-bold text-white mt-4">About TerraPulse</h1>
          <p className="text-sm text-gray-300 mt-2">Empowering communities, protecting the environment</p>
        </div>
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 space-y-5 text-sm text-gray-700 dark:text-gray-200">
          <p>
            <strong className="text-emerald-600 dark:text-emerald-400">TerraPulse</strong> is an environmental damage reporting platform built for Cameroon. Citizens can report issues like illegal dumping, flooding, erosion, water pollution, and deforestation by dropping a pin on the map and uploading a photo.
          </p>
          <p>
            Each report gets an environmental severity score so authorities can prioritise the most urgent cases. Reports are displayed as live hotspots on the public map, giving everyone visibility into what's happening in their community.
          </p>
          <p>
            Authorised personnel have access to a control dashboard where they can review incoming reports, update their status (pending review → in progress → resolved), and manage authority access.
          </p>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            Built with React, FastAPI, Firebase, and OpenStreetMap.
          </div>
        </div>
      </div>
    </div>
  )
}
