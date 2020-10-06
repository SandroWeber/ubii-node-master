class ExternalLibrariesService {
  constructor() {
    this.libraries = {};
  }

  addExternalLibrary(name, library) {
    if (this.libraries.hasOwnProperty(name)) {
      console.error(
        'InteractionModulesService.addModule() - module named "' + name + '" already exists'
      );
      return;
    }

    this.libraries[name] = library;
  }

  getExternalLibraries() {
    return this.libraries;
  }
}

module.exports = new ExternalLibrariesService();
