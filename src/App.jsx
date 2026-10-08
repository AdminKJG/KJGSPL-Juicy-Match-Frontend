import React, { useEffect } from "react";
import { useApp } from "./context/AppContext";
import Shell from "./components/layout/Shell";
import Modal from "./components/common/Modal";
import Toast from "./components/common/Toast";
import CallModal from "./components/common/CallModal";
import LiveStreamStudioModal from "./components/common/modals/livestream/LiveStreamStudioModal";
import EmptyState from "./components/common/EmptyState";

import AuthView from "./components/views/auth/AuthView";
import DiscoverView from "./components/views/discover/DiscoverView";
import ConnectionsView from "./components/views/connections/ConnectionsView";
import ChatView from "./components/views/chat/ChatView";
import ProfileView from "./components/views/profile/ProfileView";
import ExploreView from "./components/views/explore/ExploreView";
import DesiresView from "./components/views/desires/DesiresView";
import PassportView from "./components/views/passport/PassportView";
import EventsView from "./components/views/events/EventsView";
import MembershipView from "./components/views/membership/MembershipView";
import SettingsView from "./components/views/settings/SettingsView";
import PrivacyView from "./components/views/privacy/PrivacyView";
import PoliciesView from "./components/views/policies/PoliciesView";
import NotificationsView from "./components/views/notifications/NotificationsView";
import AlbumView from "./components/views/album/AlbumView";
import AssistView from "./components/views/assist/AssistView";
import { title } from "./utils/formatters";

export default function App() {
  const {
    state,
    activeRoute,
    activeCall,
    endActiveCall,
    showToast,
    activeLiveStreamModal,
    closeLiveStream,
  } = useApp();

  const [page, id] = activeRoute.split("/");

  useEffect(() => {
    document.title = `Juicy Match · ${title(page === "chat" ? "conversation" : page || "discover")}`;
  }, [page]);

  // The single React tree is returned below to prevent <Toast /> from unmounting during auth state changes

  // Render view inside Shell for authenticated members
  const renderViewContent = () => {
    switch (page) {
      case "signin":
      case "signup":
      case "discover":
        return <DiscoverView />;
      case "connections":
        return <ConnectionsView isMessages={false} />;
      case "messages":
        return <ChatView connectionId={id} />;
      case "chat":
        return <ChatView connectionId={id} />;
      case "profile":
        return <ProfileView />;
      case "explore":
        return <ExploreView />;
      case "desires":
        return <DesiresView />;
      case "passport":
        return <PassportView />;
      case "events":
        return <EventsView />;
      case "membership":
        return <MembershipView />;
      case "settings":
        return <SettingsView />;
      case "privacy":
        return <PrivacyView />;
      case "policies":
        return <PoliciesView />;
      case "notifications":
        return <NotificationsView />;
      case "album":
        return <AlbumView />;
      case "assist":
        return <AssistView />;
      default:
        return (
          <EmptyState
            heading="A little off the path"
            text="This page could not be found."
            link="discover"
            label="Back to discovery"
          />
        );
    }
  };

  return (
    <>
      {!state.authenticated ? (
        page === "signup" ? (
          <AuthView isSignup={true} />
        ) : page === "policies" ? (
          <div style={{ height: "100vh", maxHeight: "100vh", overflow: "hidden", background: "radial-gradient(ellipse at 90% 0%, rgba(53, 18, 43, 0.6), transparent 55%), var(--night)", padding: "16px 24px" }}>
            <main id="main" style={{ height: "100%", maxWidth: "1280px", margin: "0 auto" }}>
              <PoliciesView />
            </main>
          </div>
        ) : (
          <AuthView isSignup={false} />
        )
      ) : (
        <Shell>{renderViewContent()}</Shell>
      )}
      
      <Modal />
      <Toast />
      {activeCall && (
        <CallModal
          call={activeCall}
          callData={activeCall}
          onClose={endActiveCall}
          onCallEnded={endActiveCall}
          showToast={showToast}
        />
      )}
      {activeLiveStreamModal && (
        <LiveStreamStudioModal
          stream={activeLiveStreamModal.stream}
          role={activeLiveStreamModal.role}
          onClose={closeLiveStream}
          showToast={showToast}
        />
      )}
    </>
  );
}
