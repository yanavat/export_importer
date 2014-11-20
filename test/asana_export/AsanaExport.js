var chai = require("chai");
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
chai.should();
chai.use(sinonChai);

var ae = require("../../lib/asana_export");
var sqlite3 = require("sqlite3");

describe("AsanaExport", function() {
	var exp, lines;

	beforeEach(function() {
		exp = ae.AsanaExport.clone();
		exp.db()._db = new sqlite3.Database(":memory:");
		exp.prepareForImport = function() {
			this.db().create();
			this._readLines({ readLine: function() { return JSON.stringify(lines.shift()); } });
		}
		lines = [];
	});

	describe("#users()", function() {
		it("should return no users", function() {
			exp.prepareForImport();
			exp.users().should.deep.equal([]);
		});

		it("should return one user", function() {
			lines = [
				{ __object_id: 1, __type: "User", name: "mike" },
				{ __object_id: 2, __type: "VerifiedEmail", ve_user: 1, ve_email: "mike@example.com" }
			]
			exp.prepareForImport();
			exp.users().mapPerform("performGets", ["email", "name", "sourceId"]).should.deep.equal([
				{ sourceId: 1, name: "mike", email: "mike@example.com" }
			]);
		});
	});

	describe("#teams()", function() {
		it("should return no teams", function() {
			exp.prepareForImport();
			exp.teams().should.deep.equal([]);
		});

		it("should return one team", function() {
			lines = [
				{ __object_id: 1, __type: "Team", name: "team1", team_type: "REQUEST_TO_JOIN" }
			]
			exp.prepareForImport();
			exp.teams().mapPerform("performGets", ["sourceId", "name", "teamType", "sourceMemberIds"]).should.deep.equal([
				{ sourceId: 1, name: "team1", teamType: "REQUEST_TO_JOIN", sourceMemberIds: [] }
			]);
		});

		it("should return the correct members of a team", function() {
			lines = [
				{ __object_id: 1, __type: "User", name: "mike" },
				{ __object_id: 2, __type: "VerifiedEmail", ve_user: 1, ve_email: "mike@example.com" },
				{ __object_id: 3, __type: "DomainUser", user: 1 },
				{ __object_id: 4, __type: "Team", name: "team1", team_type: "REQUEST_TO_JOIN" },
				{ __object_id: 5, __type: "TeamMembership", "team": 4, "member": 3 }
			]
			exp.prepareForImport();
			exp.teams().mapPerform("performGets", ["sourceId", "name", "teamType", "sourceMemberIds"]).should.deep.equal([
				{ sourceId: 4, name: "team1", teamType: "REQUEST_TO_JOIN", sourceMemberIds: [1] }
			]);
		});
	});

	describe("#projects()", function() {
		it("should return no projects", function() {
			exp.prepareForImport();
			exp.projects().should.deep.equal([]);
		});

		it("should return one project, no tags or user task lists", function() {
			lines = [
				{ __object_id: 1, __type: "User", name: "mike" },
				{ __object_id: 2, __type: "VerifiedEmail", ve_user: 1, ve_email: "mike@example.com" },
				{ __object_id: 3, __type: "DomainUser", user: 1 },
				{ __object_id: 4, __type: "Team", name: "team1", team_type: "REQUEST_TO_JOIN" },
				{ __object_id: 5, __type: "Pot", followers_du: [], name: "project1", description: "description", is_project: true, is_archived: false, items: [], team: 4, stories: [] },
				{ __object_id: 6, __type: "Pot", followers_du: [], name: "tag1", is_project: false, is_archived: false, items: [], team: 4, stories: [] },
				{ __object_id: 7, __type: "Pot", followers_du: [], name: "My Tasks", is_project: true, assignee: 3, is_archived: false, items: [] },
				{ __object_id: 8, __type: "ProjectMembership", project: 5, member: 3 }
			]
			exp.prepareForImport();
			exp.projects().mapPerform("performGets", ["sourceId", "archived", "name", "color", "notes", "sourceTeamId", "sourceMemberIds"]).should.deep.equal([
				{ sourceId: 5, archived: false, name: "project1", color: undefined, notes: "description", sourceTeamId: 4, sourceMemberIds: [1] }
			]);
		});
	});

	describe("#tags()", function() {
		it("should return no tags", function() {
			exp.prepareForImport();
			exp.tags().should.deep.equal([]);
		});

		it("should return one tag, no projects or user task lists", function() {
			lines = [
				{ __object_id: 1, __type: "User", name: "mike" },
				{ __object_id: 2, __type: "VerifiedEmail", ve_user: 1, ve_email: "mike@example.com" },
				{ __object_id: 3, __type: "DomainUser", user: 1 },
				{ __object_id: 4, __type: "Team", name: "team1", team_type: "REQUEST_TO_JOIN" },
				{ __object_id: 5, __type: "Pot", followers_du: [], name: "project1", description: "description", is_project: true, is_archived: false, items: [], team: 4, stories: [] },
				{ __object_id: 6, __type: "Pot", followers_du: [], name: "tag1", is_project: false, is_archived: false, items: [], team: 4, stories: [] },
				{ __object_id: 7, __type: "Pot", followers_du: [], name: "My Tasks", is_project: true, assignee: 3, is_archived: false, items: [] }
			]
			exp.prepareForImport();
			exp.tags().mapPerform("performGets", ["sourceId", "name", "sourceTeamId"]).should.deep.equal([
				{ sourceId: 6, name: "tag1", sourceTeamId: 4 }
			]);
		});
	});

	describe("#taskCursorDataSource()", function() {
		it("should return no tasks", function() {
			exp.prepareForImport();
			exp.taskCursorDataSource()(0, 50).should.deep.equal([]);
		});

		it("should return one task and subtask with project, tag, assignee, follower", function() {
			lines = [
				{ __object_id: 1, __type: "User", name: "mike" },
				{ __object_id: 2, __type: "VerifiedEmail", ve_user: 1, ve_email: "mike@example.com" },
				{ __object_id: 3, __type: "DomainUser", user: 1 },
				{ __object_id: 4, __type: "Team", name: "team1", team_type: "REQUEST_TO_JOIN" },
				{ __object_id: 5, __type: "Pot", followers_du: [], name: "project1", description: "description", is_project: true, is_archived: false, items: [7], team: 4, stories: [] },
				{ __object_id: 6, __type: "Pot", followers_du: [], name: "tag1", is_project: false, is_archived: false, items: [7], team: 4, stories: [] },
				{ __object_id: 7, __type: "Task", name: "task1", schedule_status: "UPCOMING", due_date:"2023-11-30 00:00:00", description: "description", assignee: 3, attachments: [], items: [8], stories: [], followers_du: [3] },
				{ __object_id: 8, __type: "Task", name: "subtask1", schedule_status: "UPCOMING", due_date:"2023-11-30 00:00:00", description: "description", assignee: 3, attachments: [], items: [], stories: [], followers_du: [3] },
			]
			exp.prepareForImport();
			exp.taskCursorDataSource()(0, 50).mapPerform("performGets", ["sourceId", "name", "notes", "completed", "assigneeStatus", "dueOn", "sourceParentId", "sourceAssigneeId", "sourceProjectIds", "sourceTagIds", "sourceFollowerIds"]).should.deep.equal([
				{ sourceId: 7, name: "task1", notes: "description", completed: false, dueOn: "2023-11-30 00:00:00", assigneeStatus: "upcoming", sourceParentId: undefined, sourceAssigneeId: 1, sourceProjectIds: [5], sourceTagIds: [6], sourceFollowerIds: [1] },
				{ sourceId: 8, name: "subtask1", notes: "description", completed: false, dueOn: "2023-11-30 00:00:00", assigneeStatus: "upcoming", sourceParentId: 7, sourceAssigneeId: 1, sourceProjectIds: [], sourceTagIds: [], sourceFollowerIds: [1] }
			]);
		});
	});

	describe("#storyCursorDataSource()", function() {
		it("should return no stories", function() {
			exp.prepareForImport();
			exp.storyCursorDataSource()(0, 50).should.deep.equal([]);
		});

		it("should return two stories with reformatted texts, and exclude TaskDescriptionChangedStory", function() {
			lines = [
				{ __object_id: 1, __type: "User", name: "mike" },
				{ __object_id: 2, __type: "VerifiedEmail", ve_user: 1, ve_email: "mike@example.com" },
				{ __object_id: 3, __type: "DomainUser", user: 1 },
				{ __object_id: 4, __type: "Task", name: "task1", schedule_status: "UPCOMING", due_date:"2023-11-30 00:00:00", description: "description", attachments: [2], items: [], stories: [5, 6, 7], followers_du: [] },
				{ __object_id: 5, __type: "CommentStory", creator_du: 3, __creation_time: "2014-11-17 22:44:22", text: "MY COMMENT" },
				{ __object_id: 6, __type: "TaskNameChangedStory", creator_du: 3, __creation_time: "2014-11-17 22:44:22", text: "changed the name to \"task1\"" },
				{ __object_id: 7, __type: "TaskDescriptionChangedStory", creator_du: 3, __creation_time: "2014-11-17 22:44:22", text: "removed the description" }
			]
			exp.prepareForImport();
			exp.storyCursorDataSource()(0, 50).mapPerform("performGets", ["sourceId", "text", "sourceParentId"]).should.deep.equal([
				{ sourceId: 5, text: "mike commented on Mon Nov 17 2014 22:44:22:\n\nMY COMMENT", sourceParentId: 4 },
				{ sourceId: 6, text: "mike changed the name to \"task1\"", sourceParentId: 4 }
			]);
		});
	});

	describe("#attachmentCursorDataSource()", function() {
		it("should return no attachments", function() {
			exp.prepareForImport();
			exp.attachmentCursorDataSource()(0, 50).should.deep.equal([]);
		});

		it("should return one attachment", function() {
			lines = [
				{ __object_id: 1, __type: "Task", name: "task1", schedule_status: "UPCOMING", due_date:"2023-11-30 00:00:00", description: "description", attachments: [2], items: [], stories: [], followers_du: [] },
				{ __object_id: 2, __type: "Asset", name: "asset1.png", download_url: "http://example.com/asset1.png" }

			]
			exp.prepareForImport();
			exp.attachmentCursorDataSource()(0, 50).mapPerform("performGets", ["sourceId", "sourceParentId"]).should.deep.equal([
				{ sourceId: 2, sourceParentId: 1 }
			]);
		});
	});
});