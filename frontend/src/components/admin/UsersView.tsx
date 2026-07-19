import { useState, useEffect } from "react";
import { COLORS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppStore } from "@/stores/useAppStore";
import { Shield, Plus, ChevronLeft, Check, X, Eye, EyeOff } from "lucide-react";
import { initials } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────────── */

interface UserItem {
  id: number;
  email: string;
  name: string;
  role: "admin" | "supervisor" | "operador";
  is_active: boolean;
  created_at: string;
}

type RoleKey = "admin" | "supervisor" | "operador";

/* ── Role config ────────────────────────────────────────────── */

const ROLE_CONFIG: Record<RoleKey, { label: string; color: string }> = {
  admin: { label: "Admin", color: COLORS.coral },
  supervisor: { label: "Supervisor", color: COLORS.amber },
  operador: { label: "Operador", color: COLORS.aqua },
};

/* ── Helpers ────────────────────────────────────────────────── */

function RoleBadge({ role }: { role: RoleKey }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${cfg.color}22`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function Avatar({ name, role, size = 40 }: { name: string; role: RoleKey; size?: number }) {
  const color = ROLE_CONFIG[role].color;
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 font-semibold"
      style={{
        width: size,
        height: size,
        background: `${color}33`,
        color: color,
        fontSize: size * 0.36,
        border: `1.5px solid ${color}55`,
      }}
    >
      {initials(name)}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
        style={{
          background: COLORS.panel2,
          border: `1px solid ${COLORS.line}`,
          color: disabled ? COLORS.sub : COLORS.ink,
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={(e) => {
          if (!disabled) e.currentTarget.style.borderColor = COLORS.violet;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = COLORS.line;
        }}
      />
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none transition-all"
          style={{
            background: COLORS.panel2,
            border: `1px solid ${COLORS.line}`,
            color: COLORS.ink,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = COLORS.violet;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = COLORS.line;
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
          style={{ color: COLORS.faint }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all appearance-none cursor-pointer"
        style={{
          background: COLORS.panel2,
          border: `1px solid ${COLORS.line}`,
          color: COLORS.ink,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = COLORS.violet;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = COLORS.line;
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: COLORS.panel2 }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "operador", label: "Operador" },
];

/* ── User card (list item) ──────────────────────────────────── */

function UserCard({
  user,
  selected,
  onClick,
}: {
  user: UserItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all"
      style={{
        background: selected ? COLORS.panel2 : "transparent",
        border: selected ? `1px solid ${COLORS.line}` : "1px solid transparent",
      }}
      onClick={onClick}
    >
      <Avatar name={user.name} role={user.role} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: COLORS.ink }}>
          {user.name}
        </p>
        <p className="text-xs truncate" style={{ color: COLORS.sub }}>
          {user.email}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <RoleBadge role={user.role} />
        {!user.is_active && (
          <span className="text-xs" style={{ color: COLORS.faint }}>
            inactivo
          </span>
        )}
      </div>
    </button>
  );
}

/* ── Create user form ───────────────────────────────────────── */

function CreateUserForm({
  onCreated,
  onCancel,
}: {
  onCreated: (user: UserItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("operador");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Todos los campos son obligatorios");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<UserItem>("/api/users/", { name, email, password, role });
      onCreated(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al crear el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sc-scroll flex-1 overflow-y-auto p-6" style={{ background: COLORS.bg }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold" style={{ color: COLORS.ink }}>
          Nuevo usuario
        </h2>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: COLORS.sub }}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <InputField
          label="Nombre completo"
          value={name}
          onChange={setName}
          placeholder="Ej: Maria Lopez"
        />
        <InputField
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="usuario@siemprecerca.app"
        />
        <PasswordField
          label="Contraseña"
          value={password}
          onChange={setPassword}
          placeholder="Minimo 8 caracteres"
        />
        <SelectField label="Rol" value={role} onChange={setRole} options={ROLE_OPTIONS} />

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "var(--sc-coral-a13)", color: COLORS.coral }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
            style={{
              background: COLORS.violet,
              color: "#fff",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Plus size={15} />
            {loading ? "Creando..." : "Crear usuario"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: COLORS.panel2, color: COLORS.sub }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── User detail / edit panel ───────────────────────────────── */

function UserDetail({
  user,
  currentUserId,
  onBack,
  onUpdated,
}: {
  user: UserItem;
  currentUserId: number;
  onBack?: () => void;
  onUpdated: (updated: UserItem) => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<string>(user.role);
  const [isActive, setIsActive] = useState(user.is_active);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Password change (own user only)
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdOk, setPwdOk] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const isOwnUser = user.id === currentUserId;

  // Sync fields when user prop changes
  useEffect(() => {
    setName(user.name);
    setRole(user.role);
    setIsActive(user.is_active);
    setSaveOk(false);
    setSaveError(null);
    setPwdOk(false);
    setPwdError(null);
    setCurrentPwd("");
    setNewPwd("");
  }, [user.id]);

  const handleSave = async () => {
    setSaving(true);
    setSaveOk(false);
    setSaveError(null);
    try {
      const { data } = await api.patch<UserItem>(`/api/users/${user.id}`, {
        name,
        role,
        is_active: isActive,
      });
      onUpdated(data);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd || !newPwd) return;
    setPwdLoading(true);
    setPwdOk(false);
    setPwdError(null);
    try {
      await api.post("/api/users/me/password", {
        current_password: currentPwd,
        new_password: newPwd,
      });
      setPwdOk(true);
      setCurrentPwd("");
      setNewPwd("");
      setTimeout(() => setPwdOk(false), 3000);
    } catch (err: any) {
      setPwdError(err.response?.data?.detail || "Error al cambiar contrasena");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="sc-scroll flex-1 overflow-y-auto p-6" style={{ background: COLORS.bg }}>
      {/* Back button mobile */}
      {onBack && (
        <button
          className="flex items-center gap-1 mb-4 text-sm"
          style={{ color: COLORS.sub }}
          onClick={onBack}
        >
          <ChevronLeft size={18} /> Volver
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={user.name} role={user.role} size={64} />
        <div>
          <h2 className="text-xl font-bold" style={{ color: COLORS.ink }}>
            {user.name}
          </h2>
          <p className="text-sm" style={{ color: COLORS.sub }}>
            {user.email}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <RoleBadge role={user.role} />
            {!user.is_active && (
              <span
                className="inline-flex px-2 py-0.5 rounded-full text-xs"
                style={{ background: "var(--sc-faint-a09)", color: COLORS.faint }}
              >
                Inactivo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div
        className="rounded-xl p-5 mb-4"
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: COLORS.ink }}>
          Datos del usuario
        </h3>
        <div className="space-y-4 max-w-md">
          <InputField label="Nombre" value={name} onChange={setName} />
          <SelectField label="Rol" value={role} onChange={setRole} options={ROLE_OPTIONS} />

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: COLORS.sub }}>
              Estado de la cuenta
            </span>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: isActive ? "var(--sc-aqua-a13)" : "var(--sc-faint-a09)",
                color: isActive ? COLORS.aqua : COLORS.faint,
                border: isActive ? "1px solid var(--sc-aqua-a25)" : "1px solid var(--sc-faint-a09)",
              }}
            >
              {isActive ? (
                <>
                  <Check size={13} /> Activo
                </>
              ) : (
                <>
                  <X size={13} /> Inactivo
                </>
              )}
            </button>
          </div>

          {saveError && (
            <p
              className="text-sm px-3 py-2 rounded-lg"
              style={{ background: "var(--sc-coral-a13)", color: COLORS.coral }}
            >
              {saveError}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
            style={{
              background: saveOk ? COLORS.aqua : COLORS.violet,
              color: "#fff",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saveOk ? (
              <>
                <Check size={15} /> Guardado
              </>
            ) : saving ? (
              "Guardando..."
            ) : (
              "Guardar cambios"
            )}
          </button>
        </div>
      </div>

      {/* Password change — only own user */}
      {isOwnUser && (
        <div
          className="rounded-xl p-5"
          style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: COLORS.ink }}>
            Cambiar contrasena
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <PasswordField
              label="Contrasena actual"
              value={currentPwd}
              onChange={setCurrentPwd}
              placeholder="Tu contrasena actual"
            />
            <PasswordField
              label="Nueva contrasena"
              value={newPwd}
              onChange={setNewPwd}
              placeholder="Nueva contrasena"
            />

            {pwdError && (
              <p
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: "var(--sc-coral-a13)", color: COLORS.coral }}
              >
                {pwdError}
              </p>
            )}
            {pwdOk && (
              <p
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: "var(--sc-aqua-a13)", color: COLORS.aqua }}
              >
                Contrasena actualizada correctamente
              </p>
            )}

            <button
              type="submit"
              disabled={pwdLoading || !currentPwd || !newPwd}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
              style={{
                background: COLORS.amber,
                color: "#fff",
                opacity: pwdLoading || !currentPwd || !newPwd ? 0.5 : 1,
              }}
            >
              {pwdLoading ? "Actualizando..." : "Actualizar contrasena"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────── */

export default function UsersView() {
  const currentUser = useAuthStore((s) => s.user);
  const isMobile = useAppStore((s) => s.isMobile);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Guard: only admins
  if (currentUser?.role !== "admin") {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3"
        style={{ background: COLORS.bg }}
      >
        <Shield size={40} style={{ color: COLORS.faint }} />
        <p className="text-base font-semibold" style={{ color: COLORS.sub }}>
          Acceso restringido
        </p>
        <p className="text-sm" style={{ color: COLORS.faint }}>
          Solo los administradores pueden gestionar usuarios.
        </p>
      </div>
    );
  }

  const fetchUsers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data } = await api.get<UserItem[]>("/api/users/");
      setUsers(data);
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      setFetchError(err.response?.data?.detail || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetchUsers();
  }, []);

  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setShowCreate(false);
    if (isMobile) setShowDetail(true);
  };

  const handleCreated = (user: UserItem) => {
    setUsers((prev) => [...prev, user]);
    setSelectedId(user.id);
    setShowCreate(false);
    if (isMobile) setShowDetail(true);
  };

  const handleUpdated = (updated: UserItem) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  // Mobile: showing detail or create
  if (isMobile && showDetail && !showCreate) {
    if (showCreate) {
      return (
        <CreateUserForm
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      );
    }
    if (selectedUser) {
      return (
        <UserDetail
          user={selectedUser}
          currentUserId={currentUser.id}
          onBack={() => setShowDetail(false)}
          onUpdated={handleUpdated}
        />
      );
    }
  }

  if (isMobile && showCreate) {
    return (
      <CreateUserForm
        onCreated={handleCreated}
        onCancel={() => setShowCreate(false)}
      />
    );
  }

  return (
    <div className="flex h-full w-full" style={{ background: COLORS.bg }}>
      {/* Left panel — list */}
      <div
        className="sc-scroll flex flex-col overflow-y-auto border-r"
        style={{
          width: isMobile ? "100%" : 360,
          minWidth: isMobile ? undefined : 360,
          borderColor: COLORS.line,
          background: COLORS.panel,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: COLORS.line }}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: COLORS.violet }} />
            <span className="text-sm font-bold" style={{ color: COLORS.ink }}>
              Gestion de usuarios
            </span>
          </div>
          <button
            onClick={() => {
              setShowCreate(true);
              setShowDetail(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: COLORS.violet, color: "#fff" }}
          >
            <Plus size={13} />
            Nuevo usuario
          </button>
        </div>

        {/* Count */}
        <div className="px-4 py-2">
          <p className="text-xs font-bold tracking-wider" style={{ color: COLORS.sub }}>
            USUARIOS · {users.length}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 px-2 pb-4 space-y-1">
          {loading && (
            <p className="text-sm text-center py-8" style={{ color: COLORS.faint }}>
              Cargando...
            </p>
          )}
          {fetchError && (
            <div className="mx-2 mt-2 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--sc-coral-a13)", color: COLORS.coral }}>
              {fetchError}
            </div>
          )}
          {!loading &&
            !fetchError &&
            users.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                selected={!showCreate && selectedId === u.id}
                onClick={() => handleSelect(u.id)}
              />
            ))}
        </div>
      </div>

      {/* Right panel — desktop */}
      {!isMobile && (
        <div className="flex-1 overflow-hidden">
          {showCreate ? (
            <CreateUserForm
              onCreated={handleCreated}
              onCancel={() => setShowCreate(false)}
            />
          ) : selectedUser ? (
            <UserDetail
              user={selectedUser}
              currentUserId={currentUser.id}
              onUpdated={handleUpdated}
            />
          ) : !loading && users.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-2 h-full"
              style={{ background: COLORS.bg }}
            >
              <p className="text-sm" style={{ color: COLORS.faint }}>
                No hay usuarios todavia
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
