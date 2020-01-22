class InteractionModulesService {
    constructor() {
        this.modules = {};
    }

    addModule(name, moduleDependency) {
        if (this.modules.hasOwnProperty(name)) {
            console.error('InteractionModulesService.addModule() - module named "' + name + '" already exists');
            return;
        }

        this.modules[name] = moduleDependency;
    }

    getModulesObject() {
        return this.modules;
    }
}

module.exports = new InteractionModulesService();