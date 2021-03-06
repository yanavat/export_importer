var aei = require("../");

var User = module.exports = aei.ImportObject.extend().performSets({
    type: "User",
    resourceName: "users"
}).newSlots({
    workspaceId: null,
    name: null,
    email: null,
    sourceItemIds: null
}).setSlots({
    addItem: function(taskId) {
        return aei.Future.withPromise(this._resourceNamed("tasks").update(taskId, {
            assignee: this.asanaId(),
            silent: true
        })).wait();
    },

    _createResource: function(resourceData) {
        return aei.Future.withPromise(this._resourceNamed("workspaces").addUser(this.workspaceId(), resourceData)).wait();
    },

    _resourceData: function() {
        return {
            user: this.email(),
            silent: true
        };
    },
});
