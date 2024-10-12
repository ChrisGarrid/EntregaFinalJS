document.addEventListener('DOMContentLoaded', function () {
    const RESERVATION_LIMIT_PER_HOUR = 10; // Límite de reservas por hora

    // Cargar el menú desde un archivo JSON local
    fetch('menu.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar el menú. Verifique que el archivo JSON esté en la ubicación correcta.');
            }
            return response.json();
        })
        .then(data => {
            const dishOptions = document.getElementById('dishOptions');
            
            if (!dishOptions) {
                console.error('El contenedor de opciones de platos no está presente en el DOM.');
                return;
            }

            // Iterar sobre cada plato y renderizar su contenido
            data.forEach(dish => {
                const dishContainer = document.createElement('div');
                dishContainer.className = 'dish-container';

                const image = document.createElement('img');
                image.src = dish.imagen;
                image.alt = dish.nombre;
                image.className = 'dish-image';

                const label = document.createElement('label');
                label.textContent = `${dish.nombre} - $${dish.precio}`;

                const input = document.createElement('input');
                input.type = 'number';
                input.min = 0;
                input.value = 0;
                input.dataset.dish = dish.nombre;
                input.addEventListener('input', validateDishSelection);

                dishContainer.appendChild(image);
                dishContainer.appendChild(label);
                dishContainer.appendChild(input);

                dishOptions.appendChild(dishContainer);
                dishOptions.appendChild(document.createElement('br')); // Saltos de línea entre platos
            });
        })
        .catch(error => {
            console.error('Error cargando el menú:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al cargar el menú',
                text: 'No se pudo cargar el menú. Por favor, intente nuevamente.',
            });
        });

    // Clase para manejar reservas
    class Reservation {
        constructor(clientName, numOfGuests, time) {
            this.clientName = clientName;
            this.numOfGuests = numOfGuests;
            this.time = time;
            this.dishes = [];
        }

        addDishes(dishes) {
            const totalDishes = dishes.reduce((total, dish) => total + dish.quantity, 0);
            return totalDishes > this.numOfGuests ? false : (this.dishes = dishes, true);
        }

        showInfo() {
            const { clientName, numOfGuests, time, dishes } = this;
            const dishInfo = dishes.map(dish => `${dish.quantity}x ${dish.name}`).join(", ");
            return `Cliente: ${clientName}, Número de invitados: ${numOfGuests}, Hora: ${time}, Platos: ${dishInfo}`;
        }
    }

    // Clase para gestionar reservas y usar Local Storage
    class ReservationManager {
        constructor() {
            this.reservations = JSON.parse(localStorage.getItem('reservations')) || [];
            this.reservations = this.reservations.map(res => new Reservation(res.clientName, res.numOfGuests, res.time));
        }

        addReservation(reservation) {
            const reservationsAtThisHour = this.getReservationsByHour(reservation.time);
            if (reservationsAtThisHour.length >= RESERVATION_LIMIT_PER_HOUR) {
                return false;
            }
            this.reservations.push(reservation);
            localStorage.setItem('reservations', JSON.stringify(this.reservations));
            return true;
        }

        getReservationsByHour(time) {
            return this.reservations.filter(({ time: t }) => t === time);
        }

        showReservations() {
            const reservationList = document.getElementById('reservationList');
            reservationList.innerHTML = ''; // Limpiar la lista antes de mostrar

            if (this.reservations.length === 0) {
                reservationList.innerText = "No hay reservas en la lista de hoy.";
            } else {
                this.reservations.forEach(reservation => {
                    const listItem = document.createElement('li');
                    listItem.textContent = reservation.showInfo();
                    reservationList.appendChild(listItem);
                });
            }
        }
    }

    const manager = new ReservationManager();
    manager.showReservations();

    let currentReservation = null;

    window.addReservation = function () {
        const clientName = document.getElementById('clientName').value;
        const numOfGuests = document.getElementById('numOfGuests').value;
        const time = document.getElementById('time').value;

        if (!clientName || !numOfGuests || !time) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor, completa todos los campos de la reserva.',
            });
            return;
        }

        currentReservation = new Reservation(clientName, numOfGuests, time);
        document.getElementById('menuForm').style.display = 'block';
        document.getElementById('reservationForm').style.display = 'none';
        document.getElementById('maxDishes').textContent = numOfGuests;
    };

    function validateDishSelection() {
        const dishInputs = document.querySelectorAll('#dishOptions input[type="number"]');
        const totalDishes = Array.from(dishInputs).reduce((total, input) => total + parseInt(input.value), 0);
        const confirmOrderBtn = document.getElementById('confirmOrderBtn');

        if (totalDishes > parseInt(currentReservation.numOfGuests)) {
            confirmOrderBtn.disabled = true;
            confirmOrderBtn.style.backgroundColor = '#ccc';
            Swal.fire({
                icon: 'error',
                title: 'Demasiados platos',
                text: 'No puedes pedir más platos que el número de invitados.',
            });
        } else {
            confirmOrderBtn.disabled = totalDishes !== parseInt(currentReservation.numOfGuests);
            confirmOrderBtn.style.backgroundColor = confirmOrderBtn.disabled ? '#ccc' : '#007BFF';
        }
    }

    window.addMenu = function () {
        const dishInputs = document.querySelectorAll('#dishOptions input[type="number"]');
        const selectedDishes = Array.from(dishInputs)
            .filter(input => parseInt(input.value) > 0)
            .map(({ dataset: { dish }, value }) => ({
                name: dish,
                quantity: parseInt(value)
            }));

        if (selectedDishes.length > 0) {
            const success = currentReservation.addDishes(selectedDishes);
            const reservationAdded = success && manager.addReservation(currentReservation);

            if (reservationAdded) {
                showConfirmationMessage(currentReservation.showInfo());
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Límite alcanzado',
                    text: `Se ha alcanzado el límite de ${RESERVATION_LIMIT_PER_HOUR} reservas para la hora ${currentReservation.time}.`,
                });
            }
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Sin platos seleccionados',
                text: 'Por favor, selecciona al menos un plato.',
            });
        }
    };

    function showConfirmationMessage(info) {
        document.getElementById('menuForm').style.display = 'none';
        document.getElementById('confirmationMessage').style.display = 'block';
        document.getElementById('confirmationText').textContent = info;
    }

    window.acceptReservation = function () {
        document.getElementById('confirmationMessage').style.display = 'none';
        Swal.fire({
            icon: 'success',
            title: 'Reserva aceptada',
            text: 'Tu reserva ha sido aceptada.',
        });
    };

    window.newReservation = function () {
        document.getElementById('confirmationMessage').style.display = 'none';
        document.getElementById('reservationForm').style.display = 'block';
        document.getElementById('clientName').value = '';
        document.getElementById('numOfGuests').value = '';
        document.getElementById('time').value = '';
        document.querySelectorAll('#dishOptions input[type="number"]').forEach(input => input.value = 0);
    };

    window.showReservations = function () {
        manager.showReservations();
    };

    document.querySelector('.menu-toggle').addEventListener('click', function () {
        document.querySelector('.navbar').classList.toggle('active');
    });
});
