from apps.workspaces.application.interfaces import AbstractChannelRepository


class DeleteRoleUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, role_id: int) -> None:
        # Raises ChannelRoleNotFoundError or OwnerRoleImmutableError.
        self._repository.delete_role(role_id)
