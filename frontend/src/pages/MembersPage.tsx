import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import { useResource } from "../hooks";
import { formatDate } from "../logic";
import { Icon } from "../components/Icon";
import { Feedback } from "../components/Feedback";
import { CreateDialog } from "../components/CreateDialog";
import { Toast } from "../components/Toast";
import type { Notice } from "../components/Toast";
import { block, row } from "../motion";

const MotionLink = motion.create(Link);

export function MembersPage() {
  const { api } = useAuth();
  const members = useResource((signal) => api.members(signal), [api]);
  const [query, setQuery] = useState("");
  const [create, setCreate] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const filtered = members.data?.data.filter((member) =>
    `${member.name} ${member.membershipId} ${member.email}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <motion.header className="page-heading" variants={block}>
        <div>
          <span className="eyebrow">03 / The community</span>
          <h1>
            Behind every <em>book.</em>
          </h1>
          <p>Meet your readers. Follow their stories.</p>
        </div>
        <button className="button" onClick={() => setCreate(true)}>
          <Icon name="plus" size={18} />
          Register member
        </button>
      </motion.header>
      <motion.div className="catalog-tools" variants={block}>
        <div className="search-field">
          <Icon name="search" />
          <label className="sr-only" htmlFor="member-search">
            Find a member
          </label>
          <input
            id="member-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, membership ID or email…"
          />
        </div>
        <span className="directory-label eyebrow">Member directory</span>
      </motion.div>
      <motion.section className="collection" variants={block}>
        <div className="collection-caption">
          <span>
            {members.loading
              ? "Opening directory"
              : `${filtered?.length ?? 0} ${filtered?.length === 1 ? "member" : "members"}`}
          </span>
          <span>NAME / A–Z</span>
        </div>
        <Feedback
          loading={members.loading && !members.data}
          error={members.error}
          retry={members.reload}
          empty={
            filtered?.length === 0
              ? query
                ? "No readers found."
                : "Welcome your first reader."
              : undefined
          }
        >
          {filtered?.length === 0 ? (
            <p className="muted">
              {query
                ? "Try a different name or membership ID."
                : "Register a member to start their story."}
            </p>
          ) : (
            <div className="member-list">
              {filtered?.map((member, index) => (
                <MotionLink
                  key={member._id}
                  className="member-row"
                  to={`/members/${member._id}/history`}
                  variants={row}
                  custom={index}
                  initial="hidden"
                  animate="show"
                >
                  <span className="member-monogram" aria-hidden="true">
                    {member.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((name) => name[0])
                      .join("")}
                  </span>
                  <div className="member-identity">
                    <h2>{member.name}</h2>
                    <span>{member.email}</span>
                  </div>
                  <div className="member-meta">
                    <span className="isbn">{member.membershipId}</span>
                    <small>Joined {formatDate(member.joinedDate)}</small>
                  </div>
                  <span className="member-history-link">
                    View history <Icon name="arrow" size={19} />
                  </span>
                </MotionLink>
              ))}
            </div>
          )}
        </Feedback>
      </motion.section>
      <AnimatePresence>
        {create && (
          <CreateDialog
            kind="member"
            onClose={() => setCreate(false)}
            onCreated={() => {
              members.reload();
              setNotice({
                type: "success",
                message: "Member registered. A new reading journey begins.",
              });
            }}
          />
        )}
      </AnimatePresence>
      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
