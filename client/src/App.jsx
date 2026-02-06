import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import AddReference from './pages/AddReference'
import Library from './pages/Library'
import ReferenceDetail from './pages/ReferenceDetail'
import Import from './pages/Import'
import Brands from './pages/Brands'
import Assistant from './pages/Assistant'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/search" element={<Search />} />
        <Route path="/add" element={<AddReference />} />
        <Route path="/import" element={<Import />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/library" element={<Library />} />
        <Route path="/reference/:id" element={<ReferenceDetail />} />
      </Routes>
    </Layout>
  )
}

export default App
