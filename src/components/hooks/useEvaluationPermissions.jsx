import { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

const LEADER_ROLES = ['socio', 'socio_interno', 'diretor', 'supervisor_loja', 'gerente', 'lider_tecnico', 'rh'];

export function useEvaluationPermissions() {
  const { user } = useAuth();
  const { workshop } = useWorkshopContext();
  const [evaluableEmployees, setEvaluableEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [currentUserEmployee, setCurrentUserEmployee] = useState(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const allEmployees = await base44.entities.Employee.list();
        let myEmployee = null;
        
        if (user.role !== 'admin') {
            myEmployee = allEmployees.find(e => e.user_id === user.id || e.email === user.email);
        }
        
        setCurrentUserEmployee(myEmployee);
        
        const userIsAdmin = user.role === 'admin';
        const userIsLeader = userIsAdmin || (myEmployee && LEADER_ROLES.includes(myEmployee.job_role));
        
        setIsLeader(userIsLeader);
        
        let activeEmployees = allEmployees.filter(e => e.status === 'ativo');
        if (workshop) {
            activeEmployees = activeEmployees.filter(e => e.workshop_id === workshop.id);
        } else if (myEmployee && myEmployee.workshop_id) {
            activeEmployees = activeEmployees.filter(e => e.workshop_id === myEmployee.workshop_id);
        }

        if (userIsAdmin) {
          setEvaluableEmployees(activeEmployees);
        } else if (userIsLeader) {
          setEvaluableEmployees(activeEmployees);
        } else if (myEmployee) {
          setEvaluableEmployees([myEmployee]);
        } else {
          setEvaluableEmployees([]);
        }
      } catch (err) {
        console.error("Error fetching evaluation permissions", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPermissions();
  }, [user, workshop]);
  
  const canEvaluate = (employeeId) => {
    if (isLeader) return true;
    if (currentUserEmployee && currentUserEmployee.id === employeeId) return true;
    return false;
  };
  
  return { evaluableEmployees, isLeader, currentUserEmployee, loading, canEvaluate };
}