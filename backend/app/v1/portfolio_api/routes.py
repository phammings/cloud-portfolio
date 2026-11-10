"""Every API route, keyed exactly like API Gateway's routeKey ("METHOD /path"), mapped to the service that handles it.

Each entry adapts the HTTP request to a plain service call: path parameters and JSON body in, a dict out.
Adding a route here also needs it added in backend/terraform/api.tf (public) or cognito.tf (admin).
"""
from services import auth_service, content_service, items_service, upload_service, views_service

ROUTES = {
    # Public
    "GET /content": lambda request: content_service.get_content(),
    "POST /views": lambda request: views_service.count_view(),
    # Auth
    "POST /login": lambda request: auth_service.login(
        request.json().get("email"),
        request.json().get("password"),
    ),
    # Admin (API Gateway's JWT authorizer has already checked the token)
    "PUT /items/{type}/{id}": lambda request: items_service.save_item(
        request.path("type"),
        request.path("id"),
        request.json(),
    ),
    "DELETE /items/{type}/{id}": lambda request: items_service.delete_item(
        request.path("type"),
        request.path("id"),
    ),
    "POST /uploads": lambda request: upload_service.create_upload(
        request.json().get("filename"),
        request.json().get("contentType"),
    ),
}
