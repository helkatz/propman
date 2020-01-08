import { Component, OnInit } from '@angular/core';
import { PropertiesService, User } from '../services/properties.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {

  users = [] = []
  selectedUser: User
  constructor(private propertiesService: PropertiesService) { }
  onDropdownUserChange(event) {
    console.log("onChange", this.propertiesService)
    this.propertiesService.watchUsers.next({subject: this.selectedUser, change: "selected"})
  }

  ngOnInit() {
    this.propertiesService.loadUsers().then(users => {
      this.users = users.map(u => {
        return {
          label: u.firstName,
          value: u
        }
      })
    })

  }

}
