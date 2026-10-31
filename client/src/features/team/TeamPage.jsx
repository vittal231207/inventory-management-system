import { useCallback } from 'react'
import { Users } from 'lucide-react'
import ResourceManager from '../../components/ResourceManager'
import useApiQuery from '../../hooks/useApiQuery'
import { stockroomApi } from '../../services/api'

export default function TeamPage({canManage=true}){
 const loadRoles=useCallback(()=>stockroomApi.users.roles(),[]),{data:roles}=useApiQuery(loadRoles,[loadRoles])
 const options=(roles||[]).map(role=>({value:role.id,label:role.name})),fields=[{name:'name',label:'Full name',createOnly:true},{name:'email',label:'Email',type:'email',createOnly:true},{name:'password',label:'Temporary password (12+ characters)',type:'password',minLength:12,createOnly:true},{name:'roleId',label:'Access role',options,required:true}]
 const prepare=(value,item)=>item?{roleIds:[value.roleId]}:{email:value.email,name:value.name,password:value.password,roleIds:[value.roleId]}
 return <ResourceManager canManage={canManage} title="Team members" eyebrow="PEOPLE" description="Create workspace accounts and manage their access roles." icon={Users} columns={['Member','Email','Role','Status']} load={stockroomApi.users.list} create={stockroomApi.users.create} update={stockroomApi.users.updateRole} fields={fields} prepare={prepare} toRow={item=>[item.name,item.email,item.role?.name||item.role||'—',item.status||'Active']} actions={[{label:'Deactivate',show:item=>item.status==='Active',run:item=>stockroomApi.users.setStatus?stockroomApi.users.setStatus(item.id,'INACTIVE'):stockroomApi.users.deactivate(item.id)},{label:'Reactivate',show:item=>item.status==='Inactive',run:item=>stockroomApi.users.setStatus(item.id,'ACTIVE')}]}/>
}
