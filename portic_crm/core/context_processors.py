from portic_crm.core.permissions import MODULE_PERMISSIONS, user_can_access_module


def navigation(request):
    user = request.user
    modules = {}
    if user.is_authenticated:
        for module in MODULE_PERMISSIONS:
            modules[module] = user_can_access_module(user, module)
    return {"nav_modules": modules}
