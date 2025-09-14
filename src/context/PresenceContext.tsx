import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";
import { getFallbackAvatar } from "../utils/avatar";

type PresenceUser = {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
};

type PresenceContextType = {
  onlineUsers: PresenceUser[];
};

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: [] });

type PresenceMeta = {
  id: string;
  email: string;
  name?: string;
  avatar?: string | null;
};

type PresenceState = Record<string, PresenceMeta[]>;

export const PresenceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const userKey = user.id;
    const channel = supabase.channel("presence-doc", {
      config: { presence: { key: userKey } },
    });

    const updateUsers = (state: PresenceState) => {
      const usersMap: Record<string, PresenceUser> = {};

      Object.values(state)
        .flat()
        .forEach((p: PresenceMeta) => {
          const avatar = p.avatar ?? getFallbackAvatar(p.email);
          usersMap[p.id] = {
            id: p.id,
            email: p.email,
            name: p.name,
            avatar,
          };
        });

      setOnlineUsers(Object.values(usersMap));
    };

    channel
      .on("presence", { event: "sync" }, () =>
        updateUsers(channel.presenceState() as PresenceState),
      )
      .on("presence", { event: "join" }, () =>
        updateUsers(channel.presenceState() as PresenceState),
      )
      .on("presence", { event: "leave" }, () =>
        updateUsers(channel.presenceState() as PresenceState),
      );

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          id: userKey,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
