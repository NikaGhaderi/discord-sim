up:
	docker-compose up -d --build
down:
	docker-compose down
logs:
	docker-compose logs -f web
migrate:
	docker-compose exec web python manage.py migrate
makemigrations:
	docker-compose exec web python manage.py makemigrations
shell:
	docker-compose exec web python manage.py shell
test-backend:
	docker-compose exec web pytest
test-frontend:
	cd frontend && npm run test
