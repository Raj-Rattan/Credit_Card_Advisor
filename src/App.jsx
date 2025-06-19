import React from 'react'
import CreditCardAdvisor from './components/CreditCardAdvisor'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 w-full h-64 bg-gradient-to-l from-blue-500/10 to-purple-500/10 blur-3xl -z-10"></div>
      <CreditCardAdvisor />
    </div>
  )
}

export default App
