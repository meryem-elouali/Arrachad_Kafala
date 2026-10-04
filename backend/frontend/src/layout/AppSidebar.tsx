import { useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router";

import {
  TaskIcon,
  GroupIcon,
  CalenderIcon,
  GridIcon,
  ListIcon,
  PageIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";

import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  perm?: string;
  /** Rôles autorisés (sinon : contrôle par permission) */
  roles?: string[];
  match?: string[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    title: "الرئيسية",
    items: [
      {
        name: "لوحة القيادة",
        icon: <GridIcon />,
        path: "/home",
      },
    ],
  },

  {
    title: "العائلات",
    items: [
      {
        name: "إضافة عائلة",
        icon: <ListIcon />,
        path: "/form-elements",
        perm: "FAMILLES",
      },

      {
        name: "لائحة العائلات",
        icon: <TableIcon />,
        path: "/basic-tables",
        perm: "FAMILLES",
        match: ["/familleprofile"],
      },

      {
        name: "الوسطاء والكفلاء",
        icon: <GroupIcon />,
        path: "/parrains",
        perm: "FAMILLES",
        match: ["/parrains/"],
      },

      {
        name: "درجة استحقاق الأسر",
        icon: <PageIcon />,
        path: "/degre-famille",
        perm: "FAMILLES",
      },
    ],
  },

  {
    title: "الأنشطة",
    items: [
      {
        name: "التقويم",
        icon: <CalenderIcon />,
        path: "/calendar",
        perm: "EVENTS",
      },

      {
        name: "لائحة الأنشطة",
        icon: <ListIcon />,
        path: "/listeevents",
        perm: "EVENTS",
        match: ["/event-details"],
      },
    ],
  },

  {
    title: "التمدرس",
    items: [
      {
        name: "تتبع الدراسة",
        icon: <TableIcon />,
        path: "/suivi-etudes",
        perm: "ETUDES",
        match: ["/EtudesProfile"],
      },
    ],
  },

  // =========================================================
  // GESTION FINANCIERE
  // =========================================================
  {
    title: "المالية",
    items: [
      {
        name: "الإدارة المالية",
        icon: <PageIcon />,
        path: "/gestion-economique",
        perm: "FINANCE",
      },
    ],
  },

  {
    title: "اللجنة",
    items: [
      {
        name: "المخطط السنوي",
        icon: <TaskIcon />,
        path: "/planning",
      },

      {
        name: "اجتماعات اللجنة",
        icon: <CalenderIcon />,
        path: "/reunions",
        match: ["/reunions/"],
      },

      {
        name: "أعضاء اللجنة",
        icon: <GroupIcon />,
        path: "/membres",
        match: ["/membres/"],
      },

      {
        name: "إدارة المستخدمين",
        icon: <UserCircleIcon />,
        path: "/utilisateurs",
        roles: ["SUPER_ADMIN", "ADMIN"],
      },

      {
        name: "ملفي الشخصي",
        icon: <UserCircleIcon />,
        path: "/profile",
      },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "مسؤول أعلى",
  ADMIN: "مشرف",
  SIMPLE: "مستخدم",
};

const ASIDE_BASE =
  "fixed right-0 top-0 z-50 mt-16 flex h-screen flex-col border-l border-gray-200 bg-white px-4 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 lg:translate-x-0";

const AppSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
  } = useSidebar();

  const location = useLocation();

  const open =
    isExpanded ||
    isHovered ||
    isMobileOpen;

  // =========================================================
  // SESSION
  // =========================================================

  const session = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("lajna_user") ||
          "{}"
      );
    } catch {
      return {};
    }
  }, []);

  const isAdmin =
    session.role === "ADMIN" ||
    session.role === "SUPER_ADMIN";

  // =========================================================
  // PERMISSIONS
  // =========================================================

  const allowed = useCallback(
    (item: NavItem) => {
      // Restriction par rôle précis
      if (item.roles) {
        return item.roles.includes(
          session.role
        );
      }

      // Pas de permission = visible
      if (!item.perm) {
        return true;
      }

      // ADMIN et SUPER_ADMIN ont accès
      if (isAdmin) {
        return true;
      }

      // Utilisateur SIMPLE :
      // vérification des permissions
      const permissions =
        Array.isArray(
          session.permissions
        )
          ? session.permissions
          : [];

      return permissions.includes(
        item.perm
      );
    },
    [
      session.role,
      session.permissions,
      isAdmin,
    ]
  );

  // =========================================================
  // GROUPES VISIBLES
  // =========================================================

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,

        items:
          group.items.filter(
            allowed
          ),
      })).filter(
        (group) =>
          group.items.length > 0
      ),
    [allowed]
  );

  // =========================================================
  // ROUTE ACTIVE
  // =========================================================

  const isActive = (
    item: NavItem
  ) => {
    if (
      location.pathname ===
      item.path
    ) {
      return true;
    }

    return (
      item.match || []
    ).some((path) =>
      location.pathname.startsWith(
        path
      )
    );
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = () => {
    localStorage.removeItem(
      "lajna_user"
    );

    window.location.href =
      "/";
  };

  const initial = (
    session.nomComplet ||
    "؟"
  ).charAt(0);

  // =========================================================
  // ASIDE SIZE
  // =========================================================

  const asideClass =
    ASIDE_BASE +
    (open
      ? " w-[290px]"
      : " w-[90px]") +
    (isMobileOpen
      ? " translate-x-0"
      : " translate-x-full");

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <aside
      dir="rtl"
      className={asideClass}
      onMouseEnter={() => {
        if (!isExpanded) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() =>
        setIsHovered(false)
      }
    >

      {/* =====================================================
          MARQUE
      ===================================================== */}

      <div
        className={`flex items-center gap-3 py-6 ${
          open
            ? ""
            : "lg:justify-center"
        }`}
      >

        <Link
          to="/home"
          className="flex items-center gap-3"
        >

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-xl font-extrabold text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            ر
          </span>

          {open && (

            <span className="leading-tight">

              <span className="block text-base font-extrabold text-gray-800 dark:text-white">
                الرشاد للكفالة
              </span>

              <span className="block text-[11px] font-medium text-gray-400">
                اللجنة الاجتماعية
              </span>

            </span>
          )}

        </Link>

      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="no-scrollbar flex-1 overflow-y-auto pb-4">

        {groups.map(
          (
            group,
            groupIndex
          ) => (

            <div
              key={
                group.title
              }
              className={
                groupIndex === 0
                  ? ""
                  : "mt-5"
              }
            >

              {/* TITRE GROUPE */}

              {open ? (

                <h2 className="mb-2 px-3 text-[11px] font-bold tracking-wide text-gray-400">
                  {group.title}
                </h2>

              ) : (

                groupIndex > 0 && (

                  <div className="mx-3 mb-3 h-px bg-gray-100 dark:bg-gray-800" />

                )
              )}

              {/* ITEMS */}

              <ul className="flex flex-col gap-1">

                {group.items.map(
                  (item) => {

                    const active =
                      isActive(
                        item
                      );

                    const linkClass =
                      "menu-item group " +
                      (
                        active
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      ) +
                      (
                        open
                          ? ""
                          : " lg:justify-center"
                      );

                    const iconClass =
                      "menu-item-icon-size " +
                      (
                        active
                          ? "menu-item-icon-active"
                          : "menu-item-icon-inactive"
                      );

                    return (

                      <li
                        key={
                          item.path
                        }
                      >

                        <Link
                          to={
                            item.path
                          }
                          title={
                            !open
                              ? item.name
                              : undefined
                          }
                          className={
                            linkClass
                          }
                        >

                          <span
                            className={
                              iconClass
                            }
                          >
                            {item.icon}
                          </span>

                          {open && (

                            <span className="menu-item-text">
                              {item.name}
                            </span>

                          )}

                          {open &&
                            active && (

                              <span className="mr-auto h-1.5 w-1.5 rounded-full bg-brand-500" />

                            )}

                        </Link>

                      </li>
                    );
                  }
                )}

              </ul>

            </div>
          )
        )}

      </nav>

      {/* =====================================================
          CARTE UTILISATEUR
      ===================================================== */}

      <div className="border-t border-gray-100 py-4 dark:border-gray-800">

        <div
          className={
            "flex items-center gap-3 rounded-2xl bg-gray-50 p-2.5 dark:bg-white/[0.04]" +
            (
              open
                ? ""
                : " lg:justify-center lg:bg-transparent lg:p-0"
            )
          }
        >

          {/* AVATAR */}

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-base font-bold text-white">
            {initial}
          </span>

          {open && (
            <>

              {/* USER INFOS */}

              <div className="min-w-0 flex-1">

                <p className="truncate text-sm font-bold text-gray-800 dark:text-white">
                  {session.nomComplet ||
                    "—"}
                </p>

                <p className="truncate text-[11px] text-gray-400">
                  {session.fonction ||
                    ROLE_LABEL[
                      session.role
                    ] ||
                    ""}
                </p>

              </div>

              {/* LOGOUT */}

              <button
                type="button"
                onClick={
                  logout
                }
                title="تسجيل الخروج"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              >

                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >

                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />

                  <path d="m16 17 5-5-5-5" />

                  <path d="M21 12H9" />

                </svg>

              </button>

            </>
          )}

        </div>

      </div>

    </aside>
  );
};

export default AppSidebar;