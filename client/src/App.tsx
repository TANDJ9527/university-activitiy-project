import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ActivityDetail } from './pages/ActivityDetail'
import { CreateActivity } from './pages/CreateActivity'
import { EditActivity } from './pages/EditActivity'
import { ActivitySearch } from './pages/ActivitySearch'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<ActivitySearch />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="publish" element={<CreateActivity />} />
          <Route path="activity/:id" element={<ActivityDetail />} />
          <Route path="activity/:id/edit" element={<EditActivity />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
