'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signUpAction } from '@/app/actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Swal from 'sweetalert2';
import PasswordSection from '@/components/admin/users/forms/PasswordForm';
import { createClient } from '@/utils/supabase/client';

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const success = searchParams.get('success');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [rol, setRol] = useState<string>('');
  const [rolesDisponibles, setRolesDisponibles] = useState<any[]>([]);

  // Lógica de validación manual
  const cumpleRequisitos = /^.*(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W]).*$/.test(password);
  const contraseñasCoinciden = password === confirmar;
  const correoValido = email && email.endsWith('@tumuniclm.com');
  const camposCompletos = nombre && email && password && confirmar && rol;
  const formularioValido = camposCompletos && contraseñasCoinciden && cumpleRequisitos && correoValido;

  function traducirError(mensaje: string) {
    const errores: Record<string, string> = {
      'email rate limit exceeded': 'Demasiados intentos. Espere unos minutos.',
      'user already registered': 'El usuario ya está registrado.',
      'invalid login credentials': 'Credenciales incorrectas.',
      'signup requires a valid password': 'Contraseña inválida.',
      'user not found': 'Usuario no encontrado.',
    };
    return errores[mensaje.toLowerCase()] || mensaje;
  }

  // Manejo de errores y éxito con Swal
  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al crear usuario',
        text: traducirError(decodeURIComponent(error)),
        confirmButtonColor: '#d33',
      });
    }

    if (success) {
      Swal.fire({
        icon: 'success',
        title: 'Usuario creado',
        text: decodeURIComponent(success),
        confirmButtonColor: '#3085d6',
      });
    }
  }, [error, success]);

  // Carga de roles desde la base de datos
  useEffect(() => {
    const fetchRoles = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('roles').select('id, nombre');
      if (error) {
        console.error('Error al obtener roles:', error);
        return;
      }
      setRolesDisponibles(data);
    };
    fetchRoles();
  }, []);

  const handleEmailBlur = () => {
    if (email && !email.includes('@')) {
      setEmail(email.trim() + '@tumuniclm.com');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto gap-6">

      <div className="flex justify-between">
        <Button
          variant="link"
          onClick={() => router.push('/protected/admin/users')}
        >
          Volver
        </Button>
        <h1 className="text-2xl font-semibold mt-2">Nuevo Usuario</h1>
      </div>

      <span className="text-gray-600">Ingresa los datos del nuevo usuario</span>

      <form className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="nombre" className="text-sm w-20">Nombre</Label>
          <Input
            name="nombre"
            placeholder="Nombres y Apellidos"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="h-12 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="email" className="text-sm w-20">Usuario</Label>
          <Input
            name="email"
            placeholder="usuario@tumuniclm.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            className="h-12 text-sm text-bold"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="rol" className="text-sm w-20">Rol</Label>
          <select
            id="rol"
            name="rol"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md"
          >
            <option value="" className='text-sm'>Seleccione un rol</option>
            {rolesDisponibles.map((rolItem) => (
              <option key={rolItem.id} value={rolItem.id}>
                {rolItem.nombre}
              </option>
            ))}
          </select>
        </div>

        <PasswordSection
          password={password}
          confirmar={confirmar}
          onPasswordChange={setPassword}
          onConfirmarChange={setConfirmar}
        />

        <input type="hidden" name="rol" value={rol} />

        <SubmitButton
          formAction={signUpAction}
          pendingText="Creando..."
          className="h-12 text-lg"
          disabled={!formularioValido}
        >
          Crear Usuario
        </SubmitButton>
      </form>
    </div>
  );
}