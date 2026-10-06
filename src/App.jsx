import React, { useEffect } from "react";
import { useApp } from "./context/AppContext";
import Shell from "./components/layout/Shell";
import Modal from "./components/common/Modal";
import Toast from "./components/common/Toast";
import CallModal from "./components/common/CallModal";
import EmptyState from "./components/common/EmptyState";

import AuthView from "./components/views/AuthView";
import DiscoverView from "./components/views/DiscoverView";
import ConnectionsView from "./components/views/ConnectionsView";
import ChatView from "./components/views/ChatView";
import ProfileView from "./components/views/ProfileView";
import ExploreView from "./components/views/ExploreView";
import DesiresView from "./components/views/DesiresView";
import PassportView from "./components/views/PassportView";
import EventsView from "./components/views/EventsView";
import MembershipView from "./components/views/MembershipView";
import SettingsView from "./components/views/SettingsView";
import PrivacyView from "./components/views/PrivacyView";
import PoliciesView from "./components/views/PoliciesView";
import NotificationsView from "./components/views/NotificationsView";
import AlbumView from "./components/views/AlbumView";
import AssistView from "./components/views/AssistView";
import { title } from "./utils/formatters";

export default function App() {
  const { state, activeRoute, activeCall, endActiveCall, showToast } = useApp();

  const [page, id] = activeRoute.split("/");

  useEffect(() => {
    document.title = `Juicy Match · ${title(page === "chat" ? "conversation" : page || "discover")}`;
  }, [page]);

  // If not authenticated, force auth or public views
  if (!state.authenticated) {
    if (page === "signup") {
      return (
        <>
          <AuthView isSignup={true} />
          <Modal />
          <Toast />
          {activeCall && (
            <CallModal
              callData={activeCall}
              onClose={endActiveCall}
              showToast={showToast}
            />
          )}
        </>
      );
    }
    if (page === "policies") {
      return (
        <div style={{ height: "100vh", maxHeight: "100vh", overflow: "hidden", background: "radial-gradient(ellipse at 90% 0%, rgba(53, 18, 43, 0.6), transparent 55%), var(--night)", padding: "16px 24px" }}>
          <main id="main" style={{ height: "100%", maxWidth: "1280px", margin: "0 auto" }}>
            <PoliciesView />
          </main>
          <Modal />
          <Toast />
          {activeCall && (
            <CallModal
              callData={activeCall}
              onClose={endActiveCall}
              showToast={showToast}
            />
          )}
        </div>
      );
    }
    return (
      <>
        <AuthView isSignup={false} />
        <Modal />
        <Toast />
        {activeCall && (
          <CallModal
            callData={activeCall}
            onClose={endActiveCall}
            showToast={showToast}
          />
        )}
      </>
    );
  }

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
      <Shell>{renderViewContent()}</Shell>
      <Modal />
      <Toast />
      {activeCall && (
        <CallModal
          callData={activeCall}
          onClose={endActiveCall}
          showToast={showToast}
        />
      )}
    </>
  );
}
