import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ActivityDetail } from './pages/ActivityDetail'
import { EditActivity } from './pages/EditActivity'
import { ActivitySearch } from './pages/ActivitySearch'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Account } from './pages/Account'
import { Favorites } from './pages/Favorites'
import { AdminModeration } from './pages/AdminModeration'
import { AdminUsers } from './pages/AdminUsers'
import { AdminSchoolApprovals } from './pages/AdminSchoolApprovals'
import { ForgotPassword } from './pages/ForgotPassword'
import { MyRegistrations } from './pages/MyRegistrations'
import { ApplyRouter, PublishRouter } from './pages/PublishRouter'
import { RequirePlatformAdmin } from './components/RouteGuards'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<ActivitySearch />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="account" element={<Account />} />
          <Route path="account/favorites" element={<Favorites />} />
          <Route path="account/registrations" element={<MyRegistrations />} />
          <Route
            path="admin/moderation"
            element={
              <RequirePlatformAdmin>
                <AdminModeration />
              </RequirePlatformAdmin>
            }
          />
          <Route
            path="admin/users"
            element={
              <RequirePlatformAdmin>
                <AdminUsers />
              </RequirePlatformAdmin>
            }
          />
          <Route
            path="admin/school-approvals"
            element={
              <RequirePlatformAdmin>
                <AdminSchoolApprovals />
              </RequirePlatformAdmin>
            }
          />
          <Route path="publish" element={<PublishRouter />} />
          <Route path="apply" element={<ApplyRouter />} />
          <Route path="activity/:id" element={<ActivityDetail />} />
          <Route path="activity/:id/edit" element={<EditActivity />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
