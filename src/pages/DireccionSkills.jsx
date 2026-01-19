import DepartmentSkillMatrix from "../components/skillmatrix/DepartmentSkillMatrix";

export default function DireccionSkills() {
  return (
    <DepartmentSkillMatrix 
      title="Habilidades Dirección (Jefes)" 
      department="all" 
      onlyManagers={true}
      fixedDepartment={false}
    />
  );
}
